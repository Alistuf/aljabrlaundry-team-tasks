import copy
import json
import re
from dataclasses import dataclass
from typing import Any, Optional

import asyncpg


COLLECTIONS = (
    "users",
    "branch_requests",
    "notifications",
    "request_types",
    "workflow_requests",
    "uploaded_images",
)


@dataclass
class DeleteResult:
    deleted_count: int


class DocumentCursor:
    def __init__(self, collection: "DocumentCollection", query: dict, projection: Optional[dict] = None):
        self.collection = collection
        self.query = query or {}
        self.projection = projection
        self.sort_field = None
        self.sort_direction = 1

    def sort(self, field: str, direction: int):
        self.sort_field = field
        self.sort_direction = direction
        return self

    async def to_list(self, length: int):
        documents = await self.collection._all_matching(self.query, self.projection)
        if self.sort_field:
            reverse = self.sort_direction < 0
            documents.sort(key=lambda doc: doc.get(self.sort_field) or "", reverse=reverse)
        return documents[:length]


class DocumentCollection:
    def __init__(self, db: "SupabaseDocumentDB", name: str):
        self.db = db
        self.name = name

    async def insert_one(self, document: dict):
        doc = self._clean(document)
        doc_id = doc.get("id")
        if not doc_id:
            raise ValueError(f"{self.name} documents must include an id field")

        await self.db.pool.execute(
            """
            insert into app_documents (collection, id, data)
            values ($1, $2, $3::jsonb)
            on conflict (collection, id)
            do update set data = excluded.data, updated_at = now()
            """,
            self.name,
            str(doc_id),
            json.dumps(doc),
        )

    async def find_one(self, query: Optional[dict] = None, projection: Optional[dict] = None):
        matches = await self._all_matching(query or {}, projection)
        return matches[0] if matches else None

    def find(self, query: Optional[dict] = None, projection: Optional[dict] = None):
        return DocumentCursor(self, query or {}, projection)

    async def update_one(self, query: dict, update: dict):
        existing = await self.find_one(query)
        if not existing:
            return
        updated = self._apply_update(existing, update)
        await self._save(updated)

    async def update_many(self, query: dict, update: dict):
        documents = await self._all_matching(query or {}, None)
        for document in documents:
            updated = self._apply_update(document, update)
            await self._save(updated)

    async def find_one_and_update(self, query: dict, update: dict, **kwargs):
        existing = await self.find_one(query)
        if not existing:
            return None
        updated = self._apply_update(existing, update)
        await self._save(updated)
        return updated

    async def delete_one(self, query: dict):
        documents = await self._all_matching(query or {}, None)
        if not documents:
            return DeleteResult(0)
        await self.db.pool.execute(
            "delete from app_documents where collection = $1 and id = $2",
            self.name,
            str(documents[0]["id"]),
        )
        return DeleteResult(1)

    async def delete_many(self, query: dict):
        documents = await self._all_matching(query or {}, None)
        for document in documents:
            await self.db.pool.execute(
                "delete from app_documents where collection = $1 and id = $2",
                self.name,
                str(document["id"]),
            )
        return DeleteResult(len(documents))

    async def count_documents(self, query: Optional[dict] = None):
        documents = await self._all_matching(query or {}, None)
        return len(documents)

    async def estimated_document_count(self):
        return await self.db.pool.fetchval(
            "select count(*) from app_documents where collection = $1",
            self.name,
        )

    async def create_index(self, *args, **kwargs):
        return None

    async def _all_matching(self, query: dict, projection: Optional[dict]):
        records = await self.db.pool.fetch(
            "select data from app_documents where collection = $1",
            self.name,
        )
        documents = [self._decode(record["data"]) for record in records]
        return [self._project(doc, projection) for doc in documents if self._matches(doc, query)]

    async def _save(self, document: dict):
        doc = self._clean(document)
        await self.db.pool.execute(
            """
            update app_documents
            set data = $3::jsonb, updated_at = now()
            where collection = $1 and id = $2
            """,
            self.name,
            str(doc["id"]),
            json.dumps(doc),
        )

    def _apply_update(self, document: dict, update: dict):
        updated = copy.deepcopy(document)
        if "$set" in update:
            updated.update(update["$set"])
        else:
            updated.update(update)
        return self._clean(updated)

    def _matches(self, document: dict, query: dict):
        for key, expected in (query or {}).items():
            if key == "$or":
                if not any(self._matches(document, option) for option in expected):
                    return False
                continue

            actual = document.get(key)
            if isinstance(expected, dict):
                if "$ne" in expected and actual == expected["$ne"]:
                    return False
                if "$in" in expected and actual not in expected["$in"]:
                    return False
                if "$regex" in expected:
                    flags = re.IGNORECASE if expected.get("$options") == "i" else 0
                    if not re.search(expected["$regex"], str(actual or ""), flags):
                        return False
                continue

            if actual != expected:
                return False
        return True

    def _project(self, document: dict, projection: Optional[dict]):
        projected = copy.deepcopy(document)
        if not projection:
            return projected
        for field, include in projection.items():
            if include == 0:
                projected.pop(field, None)
        return projected

    def _decode(self, value: Any):
        if isinstance(value, str):
            return json.loads(value)
        return dict(value)

    def _clean(self, document: dict):
        cleaned = copy.deepcopy(document)
        cleaned.pop("_id", None)
        return cleaned


class SupabaseDocumentDB:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool = None
        self._collections = {name: DocumentCollection(self, name) for name in COLLECTIONS}

    def __getattr__(self, name: str):
        if name in self._collections:
            return self._collections[name]
        raise AttributeError(name)

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=1,
            max_size=10,
            statement_cache_size=0,
        )

    async def init_schema(self):
        await self.pool.execute(
            """
            create table if not exists app_documents (
                collection text not null,
                id text not null,
                data jsonb not null,
                created_at timestamptz not null default now(),
                updated_at timestamptz not null default now(),
                primary key (collection, id)
            )
            """
        )
        await self.pool.execute(
            "create index if not exists idx_app_documents_collection on app_documents (collection)"
        )
        await self.pool.execute(
            "create index if not exists idx_app_documents_data_gin on app_documents using gin (data)"
        )

    async def close(self):
        if self.pool:
            await self.pool.close()
