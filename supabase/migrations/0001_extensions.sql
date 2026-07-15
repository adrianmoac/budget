-- 0001_extensions
-- Enable extensions required by the schema.
-- gen_random_uuid() (used as the default for every table's uuid PK) is provided by pgcrypto.
create extension if not exists pgcrypto;
