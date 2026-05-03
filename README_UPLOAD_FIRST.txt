FGFNZ final clean fix pack

UPLOAD/REPLACE IN ROOT:
- index.html
- about.html
- history.html
- events.html
- contact.html
- donate.html
- site-style.css
- site-content.js
- config.yml

UPLOAD/REPLACE INSIDE admin/:
- admin/config.yml

UPLOAD/REPLACE INSIDE events/:
- events/girmit-connections-youth-workshop-2026.md

UPLOAD/REPLACE INSIDE images/:
- images/girmit-connections-youth-workshop-2026.png
- images/about-girmit-elders-banner.jpg

UPLOAD/REPLACE INSIDE images/uploads/:
- images/uploads/girmit-connections-youth-workshop-2026.png

Notes:
- The global header is locked using a shared site-style.css and an inline final lock on every page.
- The normal nav links are NOT blue by default. They turn blue only on hover. Donate stays blue.
- The events page uses the cover/flyer image first, then event photos.
- The Girmit Connections image is included under both images/ and images/uploads/ to prevent broken image paths.
- Events sort by date, latest/future first.

After upload, commit to staging and hard refresh with Ctrl + F5.
