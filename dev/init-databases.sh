#!/bin/bash
set -e

# Create databases for all Lan-Software ecosystem apps.
# The default database (POSTGRES_DB / lancore) is created automatically by the
# postgres Docker image; this script creates the remaining ones plus all
# testing databases.

for db in lancore lanbrackets lanshout lanhelp lanentrance; do
  # Create the testing database for every app
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    CREATE DATABASE ${db}_testing;
SQL

  # The main lancore database is already created via POSTGRES_DB
  if [ "$db" != "lancore" ]; then
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
      CREATE DATABASE ${db};
SQL
  fi
done
