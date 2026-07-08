import os
import time

import psycopg


def main() -> None:
    url = os.environ.get("DATABASE_URL_SYNC")
    if not url:
        raise SystemExit("Missing DATABASE_URL_SYNC env var")

    # Avoid `connection refused` during initial Postgres startup.
    last_err: Exception | None = None
    for attempt in range(60):
        try:
            with psycopg.connect(url) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            print("DB ready")
            return
        except Exception as e:  # noqa: BLE001
            last_err = e
            print(f"Waiting for DB ({attempt + 1}/60): {e}")
            time.sleep(2)

    raise SystemExit(f"DB not ready after retries: {last_err}")


if __name__ == "__main__":
    main()

