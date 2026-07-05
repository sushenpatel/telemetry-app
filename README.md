I like Fastapi because it has built natively with pydantic validation which allows me enforce type constraints and build custom validators for input fields

using peewee as a lightweight sql library since we have a simple data structure here and i don't want to write sql text queries. could also have used the dataset package or sqllite one thoughj. sqlalchemy is more full featured and not necessary



Concurrent requests/access to database
Depending on how the consumer is implemented, we might want to implement a lock on the database so that two consumers are not simultaneously trying to access while one is trying to update, since FastAPI is asynchronous and can handle multiple requests concurrently

Pagination
Offset based (used here) - provide offset and limit
Page based - provide page size and page number
Keyset based - provide an key id to begin results and limit
Cursor based - provide cursor to start from and limit, returns a new cursor


Docs:
http://localhost:8000/docs



Insructions to run:


To run in docker:
docker compose build --no-cache
docker compose up -d

take down:
docker compose down
docker compose down -v (deletes persistent db volume)