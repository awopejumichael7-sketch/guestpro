import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  Users, Armchair, UserCheck, CalendarDays, Plus, Search, Download,
  Upload, Camera, CheckCircle2, Clock3, Trash2, Pencil, X, ShieldCheck,
  LayoutDashboard, Settings2, Menu, ChevronDown, AlertTriangle, QrCode, Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Guest = {
  id: string;
  name: string;
  title: string;
  organization: string;
  category: string;
  phone: string;
  email: string;
  photo: string;
  seatId: string;
  invitationCode: string;
  checkedInAt: string;
  notes: string;
  createdAt: string;
};
type Seat = { id: string; section: string; row: string; number: number; status: 'available' | 'blocked' };
type EventData = { name: string; date: string; venue: string; capacity: number; section: string };

const STORAGE_KEY = 'guestpass-pro-demo-v1';
const defaultEvent: EventData = {
  name: 'Annual Convention 2026',
  date: '',
  venue: '',
  capacity: 100,
  section: 'Main Hall'
};

function makeId() {
  return crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
function makeCode() {
  return `GP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
function readSaved(): { guests: Guest[]; seats: Seat[]; event: EventData } {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) return JSON.parse(value);
  } catch { /* use defaults */ }
  return { guests: [], seats: [], event: defaultEvent };
}
function csvCell(value: string) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

export default function App() {
  const initial = useMemo(readSaved, []);
  const [guests, setGuests] = useState<Guest[]>(initial.guests);
  const [seats, setSeats] = useState<Seat[]>(initial.seats);
  const [event, setEvent] = useState<EventData>(initial.event);
  const initialCheckinCode = new URLSearchParams(window.location.search).get('checkin') ?? '';
  const [page, setPage] = useState<'overview' | 'guests' | 'seating' | 'checkin' | 'invitations' | 'settings'>(initialCheckinCode ? 'checkin' : 'overview');
  const [search, setSearch] = useState(initialCheckinCode);
  const [filter, setFilter] = useState('All guests');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [form, setForm] = useState({
    name: '', title: '', organization: '', category: 'VIP', phone: '', email: '',
    photo: '', seatId: '', notes: ''
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ guests, seats, event }));
    } catch {
      setNotice('Storage is full. Export your guest list and use smaller photos before adding more records.');
    }
  }, [guests, seats, event]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const checkedIn = guests.filter(g => Boolean(g.checkedInAt)).length;
  const assigned = guests.filter(g => Boolean(g.seatId)).length;
  const visibleGuests = guests.filter(g => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [g.name, g.title, g.organization, g.invitationCode, g.category, g.seatId]
      .some(v => v.toLowerCase().includes(q));
    const matchesFilter = filter === 'All guests'
      || (filter === 'Arrived' && Boolean(g.checkedInAt))
      || (filter === 'Not arrived' && !g.checkedInAt)
      || (filter === 'VIP' && g.category === 'VIP');
    return matchesSearch && matchesFilter;
  });

  function openNewGuest() {
    setEditing(null);
    setForm({ name: '', title: '', organization: '', category: 'VIP', phone: '', email: '', photo: '', seatId: '', notes: '' });
    setModalOpen(true);
  }
  function openEditGuest(guest: Guest) {
    setEditing(guest);
    setForm({
      name: guest.name, title: guest.title, organization: guest.organization, category: guest.category,
      phone: guest.phone, email: guest.email, photo: guest.photo, seatId: guest.seatId, notes: guest.notes
    });
    setModalOpen(true);
  }
  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('Please choose an image file.');
      return;
    }
    if (file.size > 900 * 1024) {
      setNotice('For this browser-only prototype, choose a photo smaller than 900 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm(prev => ({ ...prev, photo: String(reader.result ?? '') }));
    reader.readAsDataURL(file);
  }
  function saveGuest(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setNotice('Guest full name is required.');
      return;
    }
    if (form.seatId && guests.some(g => g.id !== editing?.id && g.seatId === form.seatId)) {
      setNotice('That seat is already assigned to another guest.');
      return;
    }
    const guest: Guest = {
      id: editing?.id ?? makeId(),
      name: form.name.trim(),
      title: form.title.trim(),
      organization: form.organization.trim(),
      category: form.category,
      phone: form.phone.trim(),
      email: form.email.trim(),
      photo: form.photo,
      seatId: form.seatId,
      invitationCode: editing?.invitationCode ?? makeCode(),
      checkedInAt: editing?.checkedInAt ?? '',
      notes: form.notes.trim(),
      createdAt: editing?.createdAt ?? new Date().toISOString()
    };
    setGuests(prev => editing ? prev.map(g => g.id === editing.id ? guest : g) : [guest, ...prev]);
    setModalOpen(false);
    setNotice(editing ? 'Guest details updated.' : 'Guest added successfully.');
  }
  function deleteGuest(guest: Guest) {
    if (!window.confirm(`Delete ${guest.name}? This cannot be undone in this browser.`)) return;
    setGuests(prev => prev.filter(g => g.id !== guest.id));
    setNotice('Guest deleted.');
  }
  function toggleCheckIn(guest: Guest) {
    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checkedInAt: g.checkedInAt ? '' : new Date().toISOString() } : g));
    setNotice(guest.checkedInAt ? 'Check-in reversed.' : `${guest.name} checked in.`);
  }
  function generateSeats() {
    const count = Math.max(1, Math.min(5000, Math.floor(Number(event.capacity) || 1)));
    const section = event.section.trim() || 'Main Hall';
    const next: Seat[] = Array.from({ length: count }, (_, i) => {
      const rowIndex = Math.floor(i / 10);
      const row = String.fromCharCode(65 + (rowIndex % 26)) + (rowIndex >= 26 ? Math.floor(rowIndex / 26) : '');
      return { id: `${section}-${row}${String((i % 10) + 1).padStart(2, '0')}`, section, row, number: (i % 10) + 1, status: 'available' };
    });
    const occupied = new Set(guests.map(g => g.seatId).filter(Boolean));
    const retained = next.filter(s => occupied.has(s.id));
    if (retained.length < occupied.size) {
      const missing = guests.filter(g => g.seatId && !next.some(s => s.id === g.seatId));
      if (missing.length && !window.confirm('Some assigned seats are outside this new layout. Continue and clear those assignments?')) return;
      setGuests(prev => prev.map(g => next.some(s => s.id === g.seatId) ? g : { ...g, seatId: '' }));
    }
    setSeats(next);
    setNotice(`${count} seats generated. Existing assignments were retained where possible.`);
  }
  function assignSeat(guestId: string, seatId: string) {
    if (seatId && guests.some(g => g.id !== guestId && g.seatId === seatId)) {
      setNotice('That seat is already assigned.');
      return;
    }
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, seatId } : g));
  }
  function exportCsv() {
    const headers = ['Name', 'Title', 'Organization', 'Category', 'Phone', 'Email', 'Seat', 'Invitation Code', 'Attendance', 'Check-in Time', 'Notes'];
    const rows = guests.map(g => [g.name, g.title, g.organization, g.category, g.phone, g.email, g.seatId, g.invitationCode, g.checkedInAt ? 'Arrived' : 'Not arrived', g.checkedInAt, g.notes]);
    const csv = [headers, ...rows].map(row => row.map(v => csvCell(String(v ?? ''))).join(',')).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'guestpass-guests.csv';
    a.click();
    URL.revokeObjectURL(url);
    setNotice('Guest list exported as CSV.');
  }
  function importCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const lines = String(reader.result ?? '').split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { setNotice('The CSV has no guest rows.'); return; }
      const parse = (line: string) => {
        const out: string[] = [];
        let value = '', quoted = false;
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === '"' && line[i + 1] === '"' && quoted) { value += '"'; i++; }
          else if (ch === '"') quoted = !quoted;
          else if (ch === ',' && !quoted) { out.push(value); value = ''; }
          else value += ch;
        }
        out.push(value);
        return out;
      };
      const header = parse(lines[0]).map(value => value.trim().toLowerCase());
      const rows = lines.slice(1).map(parse);
      const col = (row: string[], name: string, fallback: number) => {
        const index = header.indexOf(name.toLowerCase());
        return (row[index >= 0 ? index : fallback] ?? '').trim();
      };
      const added: Guest[] = rows.filter(r => col(r, 'name', 0)).map(r => ({
        id: makeId(), name: col(r, 'name', 0), title: col(r, 'title', 1), organization: col(r, 'organization', 2),
        category: col(r, 'category', 3) || 'General', phone: col(r, 'phone', 4), email: col(r, 'email', 5), photo: '',
        seatId: '', invitationCode: makeCode(), checkedInAt: '', notes: col(r, 'notes', 6), createdAt: new Date().toISOString()
      }));
      setGuests(prev => [...added, ...prev]);
      setNotice(`${added.length} guest(s) imported. Guest details imported from matching CSV columns; photos, seats, and check-in status are not imported.`);
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'guests', label: 'Guest directory', icon: Users },
    { id: 'seating', label: 'Seating plan', icon: Armchair },
    { id: 'checkin', label: 'Entrance check-in', icon: UserCheck },
    { id: 'invitations', label: 'QR invitations', icon: QrCode },
    { id: 'settings', label: 'Event settings', icon: Settings2 }
  ] as const;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">GP</div>
          <div><strong>GuestPass <span>Pro</span></strong><small>GUEST MANAGEMENT</small></div>
          <button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-card"><div className="workspace-avatar">GP</div><div><b>My Organization</b><small>Demo workspace</small></div><ChevronDown size={15} /></div>
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            return <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => { setPage(item.id); setMobileNav(false); }}>
              <Icon size={19} strokeWidth={1.8} /><span>{item.label}</span>
              {item.id === 'guests' && <em>{guests.length}</em>}
            </button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="secure-note"><ShieldCheck size={17} /><span><b>Prototype mode</b><small>Data stays in this browser</small></span></div>
          <div className="sidebar-footer">GUESTPASS PRO <span>v0.1.0</span></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb">Workspace <span>/</span> <b>{navItems.find(n => n.id === page)?.label}</b></div>
          <div className="topbar-right"><span className="status-dot"></span><span className="event-status">Event workspace</span><div className="profile-avatar">A</div></div>
        </header>

        <div className="page-content">
          {page === 'overview' && <>
            <div className="page-heading">
              <div><div className="eyebrow">EVENT CONTROL CENTER</div><h1>Good day, Administrator</h1><p>Here is what is happening with your invited guests.</p></div>
              <button className="button primary" onClick={openNewGuest}><Plus size={17} /> Add guest</button>
            </div>
            <section className="event-banner">
              <div className="event-banner-copy"><span className="banner-pill"><CalendarDays size={13} /> CURRENT EVENT</span><h2>{event.name || 'Untitled event'}</h2><p>{event.date || 'Event date not set'}{event.venue ? ` · ${event.venue}` : ''}</p></div>
              <button className="button banner-button" onClick={() => setPage('settings')}>Manage event <ChevronDown size={15} /></button>
              <div className="banner-decoration"></div>
            </section>
            <div className="stats-grid">
              <StatCard icon={<Users size={19}/>} label="Total invited guests" value={guests.length} note="Registered for this event" tone="blue" />
              <StatCard icon={<UserCheck size={19}/>} label="Guests checked in" value={checkedIn} note={`${guests.length ? Math.round(checkedIn / guests.length * 100) : 0}% of guest list`} tone="green" />
              <StatCard icon={<Armchair size={19}/>} label="Seats assigned" value={assigned} note={`${Math.max(0, seats.length - assigned)} seats available`} tone="purple" />
              <StatCard icon={<Clock3 size={19}/>} label="Awaiting arrival" value={guests.length - checkedIn} note="Guests not checked in" tone="orange" />
            </div>
            <div className="content-grid">
              <section className="panel recent-panel">
                <div className="panel-heading"><div><h3>Recently added guests</h3><p>Latest guest registrations</p></div><button className="text-button" onClick={() => setPage('guests')}>View all <span>→</span></button></div>
                {guests.length === 0 ? <EmptyState title="Your guest list starts here" text="Add your first invited guest and upload their photo for entrance identification." action="Register a guest" onAction={openNewGuest} /> :
                  <div className="recent-list">{guests.slice(0, 5).map(g => <GuestRow key={g.id} guest={g} onEdit={() => openEditGuest(g)} />)}</div>}
              </section>
              <section className="panel quick-panel">
                <div className="panel-heading"><div><h3>Quick actions</h3><p>Manage your event faster</p></div></div>
                <button className="quick-action" onClick={openNewGuest}><span className="quick-icon blue-bg"><Plus size={18}/></span><span><b>Register a guest</b><small>Add details and a photo</small></span><span className="quick-arrow">→</span></button>
                <button className="quick-action" onClick={() => setPage('seating')}><span className="quick-icon purple-bg"><Armchair size={18}/></span><span><b>Manage seating</b><small>Generate and assign seats</small></span><span className="quick-arrow">→</span></button>
                <button className="quick-action" onClick={() => setPage('checkin')}><span className="quick-icon green-bg"><UserCheck size={18}/></span><span><b>Verify at entrance</b><small>Find and check in a guest</small></span><span className="quick-arrow">→</span></button>
                <button className="quick-action" onClick={() => setPage('invitations')}><span className="quick-icon purple-bg"><QrCode size={18}/></span><span><b>Create QR invitations</b><small>Print guest passes with QR codes</small></span><span className="quick-arrow">→</span></button>
                <button className="quick-action" onClick={exportCsv}><span className="quick-icon orange-bg"><Download size={18}/></span><span><b>Export guest list</b><small>Download a CSV report</small></span><span className="quick-arrow">→</span></button>
              </section>
            </div>
            <div className="prototype-warning"><AlertTriangle size={17}/><div><b>Development preview</b><span>This version stores data in the current browser only. Do not use it for real guest personal information yet. Google Drive/Sheets sync, user authentication, and multi-organization security are not connected in this first milestone.</span></div></div>
          </>}

          {page === 'guests' && <>
            <div className="page-heading"><div><div className="eyebrow">GUEST MANAGEMENT</div><h1>Guest directory</h1><p>Register, identify, and organize your invited guests.</p></div><button className="button primary" onClick={openNewGuest}><Plus size={17}/> Add guest</button></div>
            <section className="panel directory-panel">
              <div className="directory-toolbar"><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, code, organization or seat..." /></div><select value={filter} onChange={e => setFilter(e.target.value)} className="filter-select"><option>All guests</option><option>VIP</option><option>Arrived</option><option>Not arrived</option></select><label className="button secondary upload-button"><Upload size={16}/> Import CSV<input type="file" accept=".csv,text/csv" onChange={importCsv} hidden /></label><button className="button secondary" onClick={exportCsv}><Download size={16}/> Export</button></div>
              <div className="table-wrap"><table><thead><tr><th>GUEST</th><th>CATEGORY</th><th>INVITATION CODE</th><th>ASSIGNED SEAT</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>
                {visibleGuests.map(g => <tr key={g.id}><td><div className="table-guest"><Avatar guest={g}/><span><b>{g.name}</b><small>{g.title || g.organization || 'Invited guest'}</small></span></div></td><td><span className={`category-tag ${g.category.toLowerCase().replaceAll(' ', '-')}`}>{g.category}</span></td><td><code>{g.invitationCode}</code></td><td>{g.seatId || <span className="muted">Not assigned</span>}</td><td><span className={`status-tag ${g.checkedInAt ? 'arrived' : 'pending'}`}><span></span>{g.checkedInAt ? 'Arrived' : 'Expected'}</span></td><td><div className="action-buttons"><button className="icon-button" title="Edit guest" onClick={() => openEditGuest(g)}><Pencil size={16}/></button><button className="icon-button danger-hover" title="Delete guest" onClick={() => deleteGuest(g)}><Trash2 size={16}/></button></div></td></tr>)}
                {visibleGuests.length === 0 && <tr><td colSpan={6}><EmptyState title="No guests found" text={guests.length ? 'Try another search or filter.' : 'Register a guest or import a CSV file to get started.'} action={!guests.length ? 'Add guest' : undefined} onAction={openNewGuest}/></td></tr>}
              </tbody></table></div><div className="table-footer"><span>Showing <b>{visibleGuests.length}</b> of <b>{guests.length}</b> guests</span><span>Local prototype · CSV export available</span></div>
            </section>
          </>}

          {page === 'seating' && <>
            <div className="page-heading"><div><div className="eyebrow">VENUE ORGANIZATION</div><h1>Seating plan</h1><p>Create your layout, then assign guests to individual seats.</p></div></div>
            <section className="panel seating-config"><div><h3>Generate a seating layout</h3><p>Choose a capacity. The prototype generates up to 5,000 seats per layout.</p></div><div className="seating-controls"><label>Section name<input value={event.section} onChange={e => setEvent({...event, section: e.target.value})} /></label><label>Number of seats<input type="number" min="1" max="5000" value={event.capacity} onChange={e => setEvent({...event, capacity: Number(e.target.value)})}/></label><button className="button primary" onClick={generateSeats}><Armchair size={16}/> Generate seats</button></div><div className="preset-buttons"><span>Quick select:</span>{[50,100,150,250,500].map(n => <button key={n} className="preset" onClick={() => setEvent({...event, capacity:n})}>{n}</button>)}</div></section>
            <div className="seating-summary"><div><span className="seat-legend available-legend"></span> Available <b>{Math.max(0, seats.length - new Set(guests.map(g => g.seatId).filter(Boolean)).size)}</b></div><div><span className="seat-legend occupied-legend"></span> Assigned <b>{new Set(guests.map(g => g.seatId).filter(Boolean)).size}</b></div><div><span className="seat-legend blocked-legend"></span> Blocked <b>{seats.filter(s => s.status === 'blocked').length}</b></div></div>
            {seats.length === 0 ? <section className="panel empty-seating"><Armchair size={34}/><h3>No seating layout yet</h3><p>Choose 50, 100, or a custom capacity above to generate your first seating plan.</p></section> :
              <section className="panel seating-panel"><div className="stage-label">STAGE / FRONT OF VENUE</div><div className="seat-grid">{seats.map(s => {
                const guest = guests.find(g => g.seatId === s.id);
                return <button key={s.id} className={`seat ${guest ? 'seat-occupied' : 'seat-free'}`} title={guest ? `${s.id}: ${guest.name}` : `${s.id}: Available`} onClick={() => {
                  if (guest) { setPage('guests'); setSearch(guest.name); }
                  else { setPage('guests'); setNotice(`Choose an unassigned guest and select seat ${s.id} in their edit form.`); }
                }}><span>{s.row}{String(s.number).padStart(2,'0')}</span>{guest && <small>{guest.name.split(' ')[0]}</small>}</button>;
              })}</div><div className="seating-footnote">Select an occupied seat to find its guest. To assign or move a guest, edit their profile in Guest directory.</div></section>}
          </>}

          {page === 'invitations' && <>
            <div className="page-heading"><div><div className="eyebrow">DIGITAL ADMISSION</div><h1>QR invitations</h1><p>Generate and print individual guest passes. Scanning a code opens this event workspace with the guest code ready to verify.</p></div><button className="button primary no-print" onClick={() => window.print()}><Printer size={16}/> Print invitations</button></div>
            <div className="invitation-notice no-print"><ShieldCheck size={17}/><span>At the entrance, staff must compare the guest's photo and confirm the arrival. A QR code is an identifier, not proof of identity or a secure check-in by itself.</span></div>
            {guests.length === 0 ? <section className="panel"><EmptyState title="No invitations to print yet" text="Register guests first. Each guest will receive a unique QR code tied to their invitation code." action="Register a guest" onAction={openNewGuest}/></section> :
              <div className="invitation-grid">{guests.map(g => {
                const checkinUrl = `${window.location.origin}${window.location.pathname}?checkin=${encodeURIComponent(g.invitationCode)}`;
                return <article className="invitation-card" key={g.id}>
                  <div className="invitation-brand"><div className="brand-mark">GP</div><div><b>GuestPass <span>Pro</span></b><small>OFFICIAL GUEST INVITATION</small></div></div>
                  <div className="invitation-event"><span>YOU ARE INVITED TO</span><h2>{event.name || 'Event invitation'}</h2><p>{[event.date, event.venue].filter(Boolean).join(' · ') || 'Event details to be confirmed'}</p></div>
                  <div className="invitation-main"><Avatar guest={g} large/><div className="invitation-guest"><h3>{g.name}</h3><p>{[g.title, g.organization].filter(Boolean).join(' · ') || 'Invited guest'}</p><span className="category-tag">{g.category}</span></div><div className="invitation-qr"><QRCodeSVG value={checkinUrl} size={112} level="M" includeMargin/><small>SCAN TO VERIFY</small></div></div>
                  <div className="invitation-details"><div><small>INVITATION CODE</small><b>{g.invitationCode}</b></div><div><small>ASSIGNED SEAT</small><b>{g.seatId || 'Not assigned'}</b></div></div>
                  <div className="invitation-footer"><span>Present this pass at the entrance.</span><span>GuestPass Pro</span></div>
                </article>;
              })}</div>}
          </>}

          {page === 'checkin' && <>
            <div className="page-heading"><div><div className="eyebrow">EVENT ADMISSION</div><h1>Entrance check-in</h1><p>Search the guest list, verify the photo, and record arrival.</p></div></div>
            <section className="panel checkin-panel"><div className="checkin-search"><Search size={20}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Enter guest name or invitation code..." autoFocus /></div><div className="checkin-guidance"><ShieldCheck size={17}/><span>Always compare the displayed photograph with the person at the entrance. A code alone does not prove identity.</span></div>
              <div className="checkin-results">{visibleGuests.map(g => <div className="checkin-card" key={g.id}><Avatar guest={g} large/><div className="checkin-person"><h3>{g.name}</h3><p>{[g.title, g.organization].filter(Boolean).join(' · ') || 'Invited guest'}</p><div className="checkin-meta"><span className={`category-tag ${g.category.toLowerCase().replaceAll(' ', '-')}`}>{g.category}</span><span><Armchair size={14}/> {g.seatId || 'Seat not assigned'}</span><code>{g.invitationCode}</code></div></div><div className="checkin-action">{g.checkedInAt ? <><span className="status-tag arrived"><span></span>Checked in</span><small>{new Date(g.checkedInAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</small><button className="button secondary compact" onClick={() => toggleCheckIn(g)}>Undo check-in</button></> : <button className="button primary" onClick={() => toggleCheckIn(g)}><CheckCircle2 size={16}/> Confirm arrival</button>}</div></div>)}
              {visibleGuests.length === 0 && <EmptyState title={guests.length ? 'No matching guests' : 'No guests registered'} text={guests.length ? 'Check the name or invitation code and try again.' : 'Register guests before using entrance check-in.'} action={!guests.length ? 'Add guest' : undefined} onAction={openNewGuest}/>}</div>
            </section>
          </>}

          {page === 'settings' && <>
            <div className="page-heading"><div><div className="eyebrow">CONFIGURATION</div><h1>Event settings</h1><p>Configure the event details shown on your workspace.</p></div></div>
            <section className="panel settings-panel"><div className="panel-heading"><div><h3>Event information</h3><p>These details are stored in this browser in the prototype.</p></div></div><form className="settings-form" onSubmit={e => {e.preventDefault(); setNotice('Event settings saved.');}}><label>Event name<input required value={event.name} onChange={e => setEvent({...event,name:e.target.value})} placeholder="e.g. Annual Convention"/></label><div className="form-two"><label>Event date<input type="date" value={event.date} onChange={e => setEvent({...event,date:e.target.value})}/></label><label>Venue<input value={event.venue} onChange={e => setEvent({...event,venue:e.target.value})} placeholder="Venue name"/></label></div><div className="form-two"><label>Default seating section<input value={event.section} onChange={e => setEvent({...event,section:e.target.value})}/></label><label>Planned seat capacity<input type="number" min="1" max="5000" value={event.capacity} onChange={e => setEvent({...event,capacity:Number(e.target.value)})}/></label></div><button className="button primary" type="submit">Save event details</button></form></section>
            <section className="panel data-panel"><div className="panel-heading"><div><h3>Local data management</h3><p>Export a copy before clearing this browser's stored data.</p></div></div><div className="data-actions"><button className="button secondary" onClick={exportCsv}><Download size={16}/> Export guest CSV</button><button className="button danger" onClick={() => {if(window.confirm('Delete all guests and seats from this browser? Export first if you need a copy.')) {setGuests([]);setSeats([]);setNotice('Guest and seating records cleared.');}}}><Trash2 size={16}/> Clear guest and seating data</button></div><p className="small-print">This prototype does not yet have user authentication, cloud backup, Google Drive sync, or organization-level access controls. Do not store real guests' private data in it.</p></section>
          </>}
        </div>
      </main>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => {if(e.target === e.currentTarget) setModalOpen(false);}}><section className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="guest-modal-title"><div className="modal-heading"><div><div className="eyebrow">{editing ? 'UPDATE RECORD' : 'NEW INVITATION'}</div><h2 id="guest-modal-title">{editing ? 'Edit guest details' : 'Register a guest'}</h2><p>Enter the guest information for entrance identification.</p></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={20}/></button></div>
        <form onSubmit={saveGuest}><div className="photo-upload"><div className="photo-preview">{form.photo ? <img src={form.photo} alt="Guest preview"/> : <Camera size={24}/>}</div><div><b>Guest photograph</b><p>Use a clear, recent face photo. Max 900 KB in this prototype.</p><label className="button secondary small-button">Choose photo<input type="file" accept="image/*" onChange={handlePhoto} hidden/></label></div></div>
          <div className="form-two"><label>Full name <span>*</span><input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="Guest's full name"/></label><label>Title / designation<input value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="e.g. Reverend, Dr."/></label></div>
          <div className="form-two"><label>Organization<input value={form.organization} onChange={e => setForm({...form,organization:e.target.value})} placeholder="Church or organization"/></label><label>Invitation category<select value={form.category} onChange={e => setForm({...form,category:e.target.value})}><option>VIP</option><option>Guest Minister</option><option>Church Leader</option><option>Sponsor</option><option>Government Official</option><option>Media</option><option>General</option></select></label></div>
          <div className="form-two"><label>Phone (optional)<input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="Phone number"/></label><label>Email (optional)<input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="Email address"/></label></div>
          <label>Assigned seat<select value={form.seatId} onChange={e => setForm({...form,seatId:e.target.value})}><option value="">Not assigned</option>{seats.filter(s => !guests.some(g => g.id !== editing?.id && g.seatId === s.id)).map(s => <option key={s.id} value={s.id}>{s.id}</option>)}</select></label>
          <label>Notes (optional)<textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} placeholder="Additional information for authorized staff"/></label>
          <div className="modal-actions"><button type="button" className="button secondary" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="button primary">{editing ? 'Save changes' : 'Register guest'}</button></div>
        </form>
      </section></div>}
      {notice && <div className="toast" role="status"><CheckCircle2 size={18}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </div>
  );
}

function StatCard({icon,label,value,note,tone}:{icon:ReactNode;label:string;value:number;note:string;tone:string}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div className="stat-label">{label}</div><div className="stat-value">{value.toLocaleString()}</div><div className="stat-note">{note}</div></div>;
}
function Avatar({guest,large=false}:{guest:Guest;large?:boolean}) {
  return <div className={`guest-avatar ${large?'large':''}`}>{guest.photo ? <img src={guest.photo} alt={`${guest.name} portrait`}/> : <span>{guest.name.split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase()}</span>}</div>;
}
function GuestRow({guest,onEdit}:{guest:Guest;onEdit:()=>void}) {
  return <div className="recent-row"><Avatar guest={guest}/><div className="recent-guest-info"><b>{guest.name}</b><small>{guest.category} · {guest.seatId || 'Seat pending'}</small></div><span className={`status-tag ${guest.checkedInAt?'arrived':'pending'}`}><span></span>{guest.checkedInAt?'Arrived':'Expected'}</span><button className="icon-button" onClick={onEdit} title="Edit guest"><Pencil size={15}/></button></div>;
}
function EmptyState({title,text,action,onAction}:{title:string;text:string;action?:string;onAction?:()=>void}) {
  return <div className="empty-state"><div className="empty-icon"><Users size={23}/></div><h3>{title}</h3><p>{text}</p>{action && onAction && <button className="button secondary" onClick={onAction}><Plus size={15}/>{action}</button>}</div>;
}
