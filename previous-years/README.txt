PREVIOUS YEARS — how to publish a past exhibition
==================================================

Previous exhibitions appear on the "Previous Years" page of the website.
They only need downloadable PDFs — no audio guide.

TO ADD OR UPDATE A YEAR:

1. Put the exhibition's PDF in this folder, e.g.
      previous-years/pdfs/national-outreach-2025.pdf

2. Open  assets/js/data.js  and find the  "previousYears"  list near the end.
   Edit the matching year (or add a new {...} block). Example:

      {
        "year": 2025,
        "title": "The Life of the Holy Prophet",
        "description": "Our 2025 National Outreach exhibition.",
        "sections": ["12 boards", "English"],
        "pdf": "previous-years/pdfs/national-outreach-2025.pdf"
      }

   - Set "pdf" to null while a year is still being prepared; the card then
     shows "Boards to be uploaded soon".
   - "sections" is a list of small tags shown on the card (optional).

3. Re-deploy (drag the Website folder back into Netlify, or push to git).

That's it — the page updates automatically from data.js.
