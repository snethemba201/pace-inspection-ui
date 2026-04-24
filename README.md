# Inspection UI – Pace Auto Group Task

## Overview
This is a dynamic inspection UI built using React.

The application renders inspection forms based on JSON payloads and supports:
- Required, optional, and conditional conditions
- Photo uploads (with preview and removal)
- Notes (required, optional, conditional)
- Validation before progressing
- Summary view before submission

## Supported Inspections
- Rental Inspection
- Supplier Inspection
- Site Inspection

## Features
- Fully dynamic form rendering from JSON
- One-question-at-a-time flow
- Conditional logic (e.g. severity-based rules)
- Photo upload with remove/re-upload
- Progress tracking
- Clean, user-friendly UI

## Run Instructions

1. Install dependencies:
npm install

2. Install dependencies:
npm start

3.Open in browser:
http://localhost:3000


## Notes
The UI is fully driven by the inspection payload structure, allowing new inspection types or additional lines to be supported without requiring changes to the frontend code.