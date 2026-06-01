ALTER TABLE users
    ADD CONSTRAINT users_stellar_public_key_unique UNIQUE (stellar_public_key);
