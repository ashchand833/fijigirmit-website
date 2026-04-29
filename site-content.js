const CMS_SETTINGS = {
  owner: "Ashchand833",
  repo: "fijigirmit-website",
  branch: location.hostname.startsWith("staging--") ? "staging" : "main"
};

function cmsEscapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function cmsEscapeAttr(value) { return cmsEscapeHtml(value).replace(/`/g, "&#96;"); }
function cmsNormalizeImage(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  return trimmed;
}
function cmsParseFrontmatter(raw) {
  const trimmed = raw.trim();
  let data = {}, body = "";
  if (trimmed.startsWith('{')) data = JSON.parse(trimmed);
  else {
    const fm = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
    if (!fm) return null;
    data = jsyaml.load(fm[1]) || {};
    body = (fm[2] || "").trim();
  }
  return { data, body };
}
function cmsParsePhotos(value) {
  return Array.isArray(value) ? value.map(item => {
    if (typeof item === "string") return cmsNormalizeImage(item);
    if (item && typeof item === "object") return cmsNormalizeImage(item.image || item.src || item.url || "");
    return "";
  }).filter(Boolean) : [];
}
function cmsFormatDate(value, includeWeekday=false) {
  if (!value) return "";
  const d = new Date(value); if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-NZ", { weekday: includeWeekday ? "long" : undefined, day: "numeric", month: "long", year: "numeric" });
}
function cmsParagraphs(markdownText) {
  return String(markdownText || "").split(/\n{2,}/).map(p => p.trim()).filter(Boolean).map(p => `<p>${cmsEscapeHtml(p)}</p>`).join('');
}
async function cmsFetchFolder(folder) {
  const apiUrl = `https://api.github.com/repos/${CMS_SETTINGS.owner}/${CMS_SETTINGS.repo}/contents/${folder}?ref=${CMS_SETTINGS.branch}`;
  const response = await fetch(apiUrl, { headers: { "Accept": "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`Could not load ${folder} from GitHub`);
  const items = await response.json();
  const files = items.filter(item => item.type === "file" && /\.(md|markdown|yml|yaml|json)$/i.test(item.name));
  return Promise.all(files.map(async fileItem => ({ fileItem, raw: await fetch(fileItem.download_url + `?v=${Date.now()}`).then(r => r.text()) })));
}
async function cmsLoadEvents() {
  const items = await cmsFetchFolder('events');
  const parsed = items.map(({fileItem, raw}) => {
    const parsed = cmsParseFrontmatter(raw); if (!parsed) return null;
    const data = parsed.data || {}; const photos = cmsParsePhotos(data.photos);
    return {
      slug: String(data.slug || fileItem.name.replace(/\.[^.]+$/, '')).trim(),
      title: String(data.title || fileItem.name.replace(/\.[^.]+$/, '')).trim(),
      show_on_homepage: data.show_on_homepage !== false,
      category: String(data.category || (photos.length ? 'Photo Gallery' : 'Event')).trim(),
      date: data.date || '', date_display: String(data.date_display || '').trim(), time: String(data.time || '').trim(), venue: String(data.venue || '').trim(), location: String(data.location || '').trim(),
      description: String(data.description || '').trim(), gallery_intro: String(data.gallery_intro || '').trim(), display_mode: String(data.display_mode || (photos.length ? 'gallery' : 'flyer')).trim(),
      flyer: cmsNormalizeImage(data.flyer || data.cover_image || ''), photos, sort_order: Number(data.sort_order || 9999)
    };
  }).filter(Boolean);
  return parsed.sort((a,b) => {
    const aDate = a.date ? new Date(a.date).getTime() : null, bDate = b.date ? new Date(b.date).getTime() : null;
    if (aDate && bDate) return bDate - aDate; if (aDate) return -1; if (bDate) return 1;
    return Number(a.sort_order || 9999) - Number(b.sort_order || 9999);
  });
}
async function cmsLoadNews() {
  const items = await cmsFetchFolder('news');
  const parsed = items.map(({fileItem, raw}) => {
    const parsed = cmsParseFrontmatter(raw); if (!parsed) return null;
    const data = parsed.data || {}; const slugBase = fileItem.name.replace(/\.[^.]+$/, '');
    return {
      slug: String(data.slug || slugBase.replace(/^\d{4}-\d{2}-\d{2}-/, '')).trim(),
      title: String(data.title || slugBase).trim(), publish_date: data.publish_date || '', show_on_homepage: data.show_on_homepage !== false, featured: data.featured === true,
      excerpt: String(data.excerpt || '').trim(), cover_image: cmsNormalizeImage(data.cover_image || ''), photos: cmsParsePhotos(data.photos), body: parsed.body || ''
    };
  }).filter(Boolean);
  return parsed.sort((a,b) => new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime());
}
function eventMetaLine(item) {
  const parts = []; const dateText = item.date_display || cmsFormatDate(item.date, false); if (dateText) parts.push(dateText); if (item.time) parts.push(item.time); return parts.join(' · ');
}
let eventModalItems = []; let eventModalIndex = 0; let eventModalImageIndex = 0;
function openEventModalByIndex(index) { eventModalItems = window.__eventItems || []; eventModalIndex = index; eventModalImageIndex = 0; renderEventModal(); const modal = document.getElementById('eventModal'); if (modal) { modal.classList.add('open'); document.body.style.overflow = 'hidden'; } }
function closeEventModal() { const modal = document.getElementById('eventModal'); if (modal) { modal.classList.remove('open'); document.body.style.overflow = ''; } }
function changeEventModalGallery(direction) { const item = eventModalItems[eventModalIndex]; const images = item && item.photos && item.photos.length ? item.photos : [item.flyer || 'logo.jpg']; eventModalImageIndex = (eventModalImageIndex + direction + images.length) % images.length; renderEventModal(); }
function renderEventModal() {
  const item = eventModalItems[eventModalIndex]; if (!item) return; const modal = document.getElementById('eventModal'); if (!modal) return;
  const images = item.photos && item.photos.length ? item.photos : [item.flyer || 'logo.jpg']; const imageSrc = images[eventModalImageIndex] || 'logo.jpg';
  modal.querySelector('[data-modal-title]').textContent = item.title;
  modal.querySelector('[data-modal-meta]').textContent = item.category || eventMetaLine(item);
  modal.querySelector('[data-modal-text]').innerHTML = [eventMetaLine(item), item.venue, item.location, item.description || item.gallery_intro].filter(Boolean).map(v => `<p>${cmsEscapeHtml(v)}</p>`).join('');
  const img = modal.querySelector('[data-modal-image]'); img.src = imageSrc; img.alt = item.title;
  modal.querySelector('[data-modal-counter]').textContent = `${eventModalImageIndex + 1} / ${images.length}`;
  const multiple = images.length > 1; modal.querySelector('[data-modal-prev]').style.display = multiple ? 'flex' : 'none'; modal.querySelector('[data-modal-next]').style.display = multiple ? 'flex' : 'none';
}
