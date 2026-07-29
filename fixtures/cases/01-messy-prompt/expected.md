# Task: CSV → Partitioned Parquet Merge Script

## Goal
Python 3.11 script (pandas) that merges a folder of regional sales CSV files into a single Parquet dataset.

## Requirements
- Include only CSVs that contain a `date` column; skip empty files.
- Normalize column aliases: `Region` and `region_name` → one canonical column.
- Parse mixed date formats (`MM/DD/YYYY` and ISO 8601); output column named `date` (lowercase).
- Output: single Parquet dataset, partitioned by year.
- Scale: ~10,000 files — must be fast.

## Error handling
- On per-file parse failure: log and continue (never crash).
- Add logging throughout.
