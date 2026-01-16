import urllib.request
import urllib.error
import json
import csv
import time
import argparse
import logging
import signal
import sys
import os
from datetime import datetime
from typing import Dict, List, Set, Optional

# --- Configuration ---
API_BASE_URL = "https://api.nytimes.com/svc/books/v3/lists/overview.json"
DEFAULT_DELAY = 6.0
OUTPUT_FILE = "nyt_library_export.csv"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)

class LibraryBuilder:
    def __init__(self, api_key: str, max_weeks: int):
        self.api_key = api_key
        self.max_weeks = max_weeks
        self.seen_isbns: Set[str] = set()
        self.library_data: List[Dict] = []
        self.is_running = True
        self.resume_date: Optional[str] = None

        # Hydrate state from existing file
        self.load_state()

        signal.signal(signal.SIGINT, self.handle_exit)

    def load_state(self):
        """Scans existing CSV to populate ISBN cache and find resume point."""
        if not os.path.exists(OUTPUT_FILE):
            logger.info("No existing database found. Starting fresh.")
            return

        try:
            with open(OUTPUT_FILE, mode='r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                dates = []
                count = 0
                for row in reader:
                    isbn = row.get("isbn13")
                    date = row.get("first_seen_date")

                    if isbn:
                        self.seen_isbns.add(isbn)
                    if date:
                        dates.append(date)
                    count += 1

                # Logic: We walk backwards in time. To resume, we need the oldest date.
                if dates:
                    dates.sort()
                    self.resume_date = dates[0] # The earliest date recorded
                    logger.info(f"Resuming database. Loaded {count} books. Resuming from {self.resume_date}.")
                else:
                    logger.info("Database file exists but is empty.")

        except Exception as e:
            logger.error(f"Failed to read existing database: {e}")

    def handle_exit(self, signum, frame):
        logger.warning("\nInterrupt received. Saving buffer...")
        self.is_running = False

    def fetch_overview(self, date_str: Optional[str] = None) -> Dict:
        params = f"?api-key={self.api_key}"
        if date_str:
            params += f"&published_date={date_str}"

        url = f"{API_BASE_URL}{params}"

        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as response:
                if response.status != 200:
                    return {}
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                logger.warning("Rate limit. Sleeping 30s...")
                time.sleep(30)
            elif e.code == 404:
                logger.error(f"Date {date_str} not found. Stopping.")
                self.is_running = False
            else:
                logger.error(f"HTTP Error: {e.code}")
            return {}
        except Exception as e:
            logger.error(f"Network Error: {e}")
            return {}

    def process_week(self, data: Dict) -> Optional[str]:
        results = data.get("results", {})
        lists = results.get("lists", [])

        # Get navigation dates
        previous_date = results.get("previous_published_date")
        current_date = results.get("bestsellers_date")

        count_new = 0

        for category in lists:
            list_name = category.get("list_name")
            for book in category.get("books", []):
                isbn = book.get("primary_isbn13")

                if not isbn or isbn in self.seen_isbns:
                    continue

                cover_url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"

                entry = {
                    "isbn13": isbn,
                    "title": book.get("title", "").title(),
                    "author": book.get("author", ""),
                    "description": book.get("description", ""),
                    "publisher": book.get("publisher", ""),
                    "nyt_list_category": list_name,
                    "first_seen_date": current_date,
                    "cover_url": cover_url,
                    "weeks_on_list": book.get("weeks_on_list", 0),
                    "rank": book.get("rank")
                }

                self.library_data.append(entry)
                self.seen_isbns.add(isbn)
                count_new += 1

        logger.info(f"Week {current_date}: +{count_new} unique books.")
        return previous_date

    def save_to_csv(self):
        if not self.library_data:
            logger.info("No new data to save.")
            return

        headers = [
            "isbn13", "title", "author", "description", "nyt_list_category",
            "first_seen_date", "cover_url", "publisher", "rank", "weeks_on_list"
        ]

        file_exists = os.path.exists(OUTPUT_FILE)
        mode = 'a' if file_exists else 'w'

        try:
            with open(OUTPUT_FILE, mode=mode, newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=headers)
                if not file_exists:
                    writer.writeheader()
                writer.writerows(self.library_data)
            logger.info(f"Appended {len(self.library_data)} new books to {OUTPUT_FILE}")
            self.library_data = [] # Clear buffer after save
        except IOError as e:
            logger.error(f"File I/O Error: {e}")

    def run(self):
        logger.info(f"Starting fetch. Target depth: {self.max_weeks} additional weeks.")

        # If resuming, fetch the 'previous' date of the last known date immediately
        # to avoid re-fetching the resume_date itself.
        if self.resume_date:
             # We need to fetch the resume_date one last time to get the *pointer* to the previous week
             # Or we can just start there. NYT API includes 'previous_published_date' in the response.
             next_date = self.resume_date
        else:
             next_date = None # Start from today

        weeks_processed = 0

        while self.is_running and weeks_processed < self.max_weeks:
            data = self.fetch_overview(next_date)

            if not data:
                time.sleep(10)
                continue

            # Critical: Get the pointer to the past
            prev_pointer = data.get("results", {}).get("previous_published_date")

            # If we are resuming, we likely already processed 'next_date'.
            # We strictly want to move to the previous week.
            # The process_week function will skip ISBNs we already have,
            # so it is safe to re-process the resume_date week to get the pointer.

            self.process_week(data)

            # Move pointer backward
            next_date = prev_pointer
            weeks_processed += 1

            if not next_date:
                logger.info("Reached beginning of time (2008).")
                break

            if self.is_running:
                time.sleep(DEFAULT_DELAY)

        self.save_to_csv()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NYT Best Seller Library Builder V2")
    parser.add_argument("api_key", help="Your NYT API Key")
    parser.add_argument("--weeks", type=int, default=52, help="Number of additional weeks to fetch")

    args = parser.parse_args()

    builder = LibraryBuilder(args.api_key, args.weeks)
    builder.run()
