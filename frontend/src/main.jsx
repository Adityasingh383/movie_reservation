import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './styles.css'

const API_ROOT = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api'
const TOKEN_KEY = 'cinema_token'
const USER_KEY = 'cinema_user'
const MOVIE_IMAGES = [
  'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1100&q=85',
  'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1100&q=85',
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1100&q=85',
  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1100&q=85',
  'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1100&q=85'
]

const movieImage = (id) => MOVIE_IMAGES[(Number(id) - 1) % MOVIE_IMAGES.length] || MOVIE_IMAGES[0]

const http = axios.create({ baseURL: API_ROOT })

const api = async (path, options = {}) => {
  const token = localStorage.getItem(TOKEN_KEY)
  try {
    const response = await http.request({ url: path, method: options.method || 'GET', data: options.body ? JSON.parse(options.body) : undefined, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } })
    return response.data
  } catch (error) {
    const publicRequest = path === '/movies' || path.startsWith('/movies/') || path === '/shows' || path.startsWith('/shows/') || path.startsWith('/auth/')
    if (error.response?.status === 401 && !publicRequest) window.dispatchEvent(new Event('session-expired'))
    throw new Error(error.response?.data?.message || error.response?.data || error.message || `Request failed (${error.response?.status || 'network error'})`)
  }
}

const formatDate = (value, withTime = true) => {
  if (!value) return '—'
  const date = new Date(value)
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', ...(withTime ? { timeStyle: 'short' } : {}) }).format(date)
}

const getSession = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = JSON.parse(localStorage.getItem(USER_KEY))
    if (!token || !user) return null
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); return null
    }
    return user
  } catch { return null }
}

function Icon({ children }) { return <span className="icon" aria-hidden="true">{children}</span> }

function App() {
  const [session, setSession] = useState(getSession)
  const [route, setRoute] = useState(window.location.hash || '#home')
  const [movies, setMovies] = useState([])
  const [shows, setShows] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  const navigate = (next) => { window.location.hash = next }
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#home')
    const expired = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setSession(null); navigate('#login') }
    window.addEventListener('hashchange', onHash); window.addEventListener('session-expired', expired)
    return () => { window.removeEventListener('hashchange', onHash); window.removeEventListener('session-expired', expired) }
  }, [])
  useEffect(() => {
    Promise.allSettled([api('/movies'), api('/shows')]).then(([movieResult, showResult]) => {
      if (movieResult.status === 'fulfilled') setMovies(movieResult.value || [])
      if (showResult.status === 'fulfilled') setShows(showResult.value || [])
      const failed = [movieResult, showResult].find((result) => result.status === 'rejected')
      if (failed) setNotice({ type: 'error', text: failed.reason.message })
    }).finally(() => setLoading(false))
  }, [])
  useEffect(() => {
    if (session && route === '#bookings') api('/bookings/my').then(setBookings).catch((error) => setNotice({ type: 'error', text: error.message }))
  }, [session, route])
  const logout = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setSession(null); navigate('#home'); showNotice('Signed out') }
  const showNotice = (text, type = 'success') => { setNotice({ type, text }); setTimeout(() => setNotice(null), 4500) }
  const refreshCatalog = async () => { const [movieResult, showResult] = await Promise.allSettled([api('/movies'), api('/shows')]); if (movieResult.status === 'fulfilled') setMovies(movieResult.value || []); if (showResult.status === 'fulfilled') setShows(showResult.value || []); const failed = [movieResult, showResult].find((result) => result.status === 'rejected'); if (failed) throw failed.reason }
  const isAdmin = session?.role === 'ADMIN'
  const movieId = route.startsWith('#movie/') ? Number(route.split('/')[1]) : null
  const showId = route.startsWith('#show/') ? Number(route.split('/')[1]) : null
  const bookingId = route.startsWith('#booking/') ? Number(route.split('/')[1]) : null
  const currentMovie = movies.find((movie) => movie.id === movieId)
  const currentShow = shows.find((show) => show.id === showId)

  let content
  if (route === '#login') content = <AuthPage mode="login" onSuccess={(user) => { setSession(user); navigate('#home') }} />
  else if (route === '#register') content = <AuthPage mode="register" onSuccess={() => navigate('#login')} />
  else if (bookingId) content = session ? <BookingDetailsPage bookingId={bookingId} navigate={navigate} notify={showNotice} /> : <Gate navigate={navigate} />
  else if (route === '#bookings') content = session ? <BookingsPage bookings={bookings} notify={showNotice} /> : <Gate navigate={navigate} />
  else if (route === '#admin') content = isAdmin ? <AdminManagementPage movies={movies} shows={shows} refresh={refreshCatalog} notify={showNotice} /> : <Gate navigate={navigate} />
  else if (showId && currentShow) content = <ShowPage show={currentShow} movie={movies.find((movie) => movie.id === currentShow.movie?.id)} session={session} notify={showNotice} />
  else if (movieId && currentMovie) content = <MoviePage movie={currentMovie} shows={shows.filter((show) => show.movie?.id === movieId)} navigate={navigate} />
  else content = <HomePage movies={movies} shows={shows} navigate={navigate} loading={loading} />

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => navigate('#home')}><span className="brand-mark">✦</span><span>CINEMA<span className="brand-dot">.</span></span></button>
      <nav><button className={route === '#home' ? 'active' : ''} onClick={() => navigate('#home')}>Discover</button>{session && <button className={route === '#bookings' ? 'active' : ''} onClick={() => navigate('#bookings')}>My bookings</button>}{isAdmin && <button className={route === '#admin' ? 'active' : ''} onClick={() => navigate('#admin')}>Manage</button>}</nav>
      <div className="account">{session ? <><span className="user-chip">{session.username?.slice(0, 1).toUpperCase()}</span><span className="user-name">{session.username}</span><button className="text-button" onClick={logout}>Log out</button></> : <><button className="text-button" onClick={() => navigate('#login')}>Log in</button><button className="button button-small" onClick={() => navigate('#register')}>Join now</button></>}</div>
    </header>
    {notice && <div className={`toast ${notice.type}`}><Icon>{notice.type === 'error' ? '!' : '✓'}</Icon>{notice.text}</div>}
    <main>{content}</main>
    <footer><span>✦ CINEMA.</span><span>Your seat is waiting.</span><span>© 2026</span></footer>
  </div>
}

function HomePage({ movies, shows, navigate, loading }) {
  return <><section className="hero"><div className="hero-copy"><p className="eyebrow">THE BIG SCREEN, YOUR WAY</p><h1>Stories worth<br /><em>showing up for.</em></h1><p className="hero-sub">Find your next favorite film, pick the perfect seat, and make a night of it.</p><button className="button" onClick={() => document.getElementById('now-showing')?.scrollIntoView({ behavior: 'smooth' })}>Explore films <span>↗</span></button></div><div className="hero-art"><div className="sun"></div><div className="ticket">ADMIT<br /><strong>ONE</strong><small>GOOD TIMES ONLY</small></div><div className="film-reel">◉</div><span className="art-caption">FRAME<br />YOUR NIGHT</span></div></section><section id="now-showing" className="section"><div className="section-heading"><div><p className="eyebrow">CURATED FOR YOU</p><h2>Now showing</h2></div><span className="count-label">{movies.length} films · {shows.length} showtimes</span></div>{loading ? <Loading /> : movies.length ? <div className="movie-grid">{movies.map((movie, index) => <MovieCard key={movie.id} movie={movie} index={index} shows={shows} navigate={navigate} />)}</div> : <Empty title="The projector is warming up" text="No movies have been added yet. Check back soon." />}</section><section className="quote-band"><span>“</span><p>There’s no better feeling than the lights going down and the story beginning.</p><small>— CINEMA CLUB</small></section></>
}

function MovieCard({ movie, index, shows, navigate }) {
  const colors = ['coral', 'blue', 'gold', 'purple', 'green']
  const nextShow = shows.find((show) => show.movie?.id === movie.id)
  return <article className={`movie-card ${colors[index % colors.length]}`} onClick={() => navigate(`#movie/${movie.id}`)}><div className="poster" style={{ backgroundImage: `linear-gradient(180deg, rgba(11, 12, 18, .05) 15%, rgba(11, 12, 18, .86) 100%), url(${movieImage(movie.id)})` }}><span className="poster-number">0{index + 1}</span><div className="poster-symbol">{['◒', '✦', '◈', '◉', '◇'][index % 5]}</div><span className="poster-title">{movie.title}</span></div><div className="movie-card-info"><div><h3>{movie.title}</h3><p>{movie.genre || 'Feature film'} <span>·</span> {movie.duration} min</p></div><span className="arrow">↗</span></div>{nextShow && <p className="next-show">Next showing · {formatDate(nextShow.startTime)}</p>}</article>
}

function MoviePage({ movie, shows, navigate }) { return <section className="detail-page"><button className="back-link" onClick={() => navigate('#home')}>← Back to films</button><div className="detail-grid"><div className="large-poster coral" style={{ backgroundImage: `linear-gradient(180deg, rgba(11, 12, 18, .05) 20%, rgba(11, 12, 18, .88) 100%), url(${movieImage(movie.id)})` }}><span className="poster-number">FEATURE</span><div className="poster-symbol">✦</div><span className="poster-title">{movie.title}</span></div><div className="detail-copy"><p className="eyebrow">{movie.genre || 'FEATURE FILM'} · {movie.duration} MIN</p><h1>{movie.title}</h1><p className="description">{movie.description || 'A cinematic experience waiting to be discovered.'}</p><h3 className="minor-heading">Choose a showing</h3>{shows.length ? <div className="show-list">{shows.map((show) => <button className="show-row" key={show.id} onClick={() => navigate(`#show/${show.id}`)}><span><strong>{formatDate(show.startTime, false)}</strong><small>{formatDate(show.startTime).split(', ').pop()} – {formatDate(show.endTime).split(', ').pop()}</small></span><span className="arrow">↗</span></button>)}</div> : <Empty title="No showtimes yet" text="This film will be scheduled soon." />}</div></div></section> }

function ShowPage({ show, movie, session, notify }) {
  const [seats, setSeats] = useState([]); const [selected, setSelected] = useState(null); const [confirmation, setConfirmation] = useState(null); const [busy, setBusy] = useState(false)
  useEffect(() => { api(`/shows/${show.id}/seats`).then(setSeats).catch((error) => notify(error.message, 'error')) }, [show.id])
  const book = async () => { if (!selected) return; if (!session) { window.location.hash = '#login'; return } if (!window.confirm(`Reserve seat ${selected.seatNumber}?`)) return; setBusy(true); try { const booking = await api('/bookings', { method: 'POST', body: JSON.stringify({ showId: show.id, seatId: selected.seatId }) }); notify(`${selected.seatNumber} is yours. Enjoy the show!`); setConfirmation(booking); setSelected(null); setSeats(await api(`/shows/${show.id}/seats`)) } catch (error) { notify(error.message, 'error'); setSeats(await api(`/shows/${show.id}/seats`).catch(() => seats)) } finally { setBusy(false) } }
  const grouped = ['A', 'B', 'C'].map((row) => seats.filter((seat) => seat.seatNumber?.startsWith(row)))
  if (confirmation) return <section className="confirmation-page"><div className="confirmation-mark">✓</div><p className="eyebrow">RESERVATION CONFIRMED</p><h1>Your seat is waiting.</h1><p className="confirmation-copy">Booking #{confirmation.bookingId} for <strong>{confirmation.movieTitle}</strong>, seat <strong>{confirmation.seatNumber}</strong>.</p><p className="confirmation-time">{formatDate(confirmation.showTime)}</p><div className="confirmation-actions"><button className="button" onClick={() => { window.location.hash = `#booking/${confirmation.bookingId}` }}>View booking <span>↗</span></button><button className="text-button" onClick={() => { setConfirmation(null); setSeats([]); api(`/shows/${show.id}/seats`).then(setSeats) }}>Book another seat</button></div></section>
  return <section className="booking-page"><div className="booking-heading"><div><p className="eyebrow">SELECT YOUR SEAT</p><h1>{movie?.title || show.movie?.title || 'Movie'} <span>·</span> <small>{formatDate(show.startTime)}</small></h1></div><div className="show-meta"><span>SCREEN 01</span><span>{formatDate(show.endTime).split(', ').pop()} finish</span></div></div><div className="booking-layout"><div className="seat-panel"><div className="screen"><span>SCREEN</span></div><div className="seat-map">{grouped.map((rowSeats, index) => <div className="seat-row" key={index}><span className="row-label">{String.fromCharCode(65 + index)}</span>{rowSeats.map((seat) => <button key={seat.seatId} disabled={seat.status !== 'AVAILABLE'} className={`seat ${seat.status.toLowerCase()} ${selected?.seatId === seat.seatId ? 'selected' : ''}`} onClick={() => setSelected(seat)}>{seat.seatNumber?.slice(1)}</button>)}</div>)}</div><div className="legend"><span><i className="available"></i>Available</span><span><i className="selected-dot"></i>Selected</span><span><i className="booked"></i>Booked</span></div></div><aside className="booking-summary"><p className="eyebrow">YOUR RESERVATION</p><h2>{selected ? selected.seatNumber : 'Pick a seat'}</h2><p>{selected ? 'One ticket · Standard admission' : 'Select an available seat to continue.'}</p><div className="summary-line"><span>Showtime</span><strong>{formatDate(show.startTime)}</strong></div><div className="summary-line"><span>Seat</span><strong>{selected?.seatNumber || '—'}</strong></div><button className="button full" disabled={!selected || busy} onClick={book}>{busy ? 'Reserving…' : session ? 'Confirm reservation' : 'Log in to reserve'} <span>↗</span></button><small className="secure-note">✦ Instant confirmation · Secure reservation</small></aside></div></section>
}

function AuthPage({ mode, onSuccess }) { const login = mode === 'login'; const [form, setForm] = useState({ username: '', password: '' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { if (!login) { await api('/auth/register', { method: 'POST', body: JSON.stringify(form) }); onSuccess() } else { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }); const [, payload] = data.token.split('.'); const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))); const user = { username: claims.sub, role: claims.role }; localStorage.setItem(TOKEN_KEY, data.token); localStorage.setItem(USER_KEY, JSON.stringify(user)); onSuccess(user) } } catch (e) { setError(e.message) } finally { setBusy(false) } }; return <section className="auth-page"><div className="auth-art"><span>✦</span><p>MAKE A<br /><em>NIGHT</em><br />OF IT.</p></div><div className="auth-card"><p className="eyebrow">{login ? 'WELCOME BACK' : 'WELCOME IN'}</p><h1>{login ? 'Ready for a good story?' : 'Your seat at the table.'}</h1><p className="auth-intro">{login ? 'Sign in to manage your reservations and keep the good times rolling.' : 'Create an account and make every movie night one to remember.'}</p><form onSubmit={submit}><label>Username<input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="your username" /></label><label>Password<input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" /></label>{error && <p className="form-error">{error}</p>}<button className="button full" disabled={busy}>{busy ? 'Please wait…' : login ? 'Sign in' : 'Create account'} <span>↗</span></button></form><p className="switch-auth">{login ? 'New to Cinema?' : 'Already have an account?'} <button onClick={() => { window.location.hash = login ? '#register' : '#login' }}>{login ? 'Create an account' : 'Sign in'}</button></p></div></section> }

function BookingsPage({ bookings, notify }) {
  const [items, setItems] = useState(bookings)
  const [busyId, setBusyId] = useState(null)

  useEffect(() => setItems(bookings), [bookings])

  const cancel = async (bookingId) => {
    if (!window.confirm('Cancel this booking? The seat will become available again.')) return
    setBusyId(bookingId)
    try {
      await api(`/bookings/${bookingId}`, { method: 'DELETE' })
      setItems((current) => current.filter((booking) => booking.bookingId !== bookingId))
      notify('Booking cancelled and seat released')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setBusyId(null)
    }
  }

  return <section className="section bookings-page"><div className="section-heading"><div><p className="eyebrow">YOUR CINEMA JOURNEY</p><h1>My bookings</h1></div><span className="count-label">{items.length} reservation{items.length === 1 ? '' : 's'}</span></div>{items.length ? <div className="booking-list">{items.map((booking) => <article className="booking-card" key={booking.bookingId}><div className="booking-icon">✦</div><div className="booking-card-main" onClick={() => { window.location.hash = `#booking/${booking.bookingId}` }}><p className="eyebrow">CONFIRMED · #{booking.bookingId}</p><h2>{booking.movieTitle}</h2><p>{formatDate(booking.showTime)} <span>·</span> Seat {booking.seatNumber}</p></div><div className="booking-date"><small>BOOKED ON</small><strong>{formatDate(booking.bookingTime, false)}</strong><button className="cancel-button" disabled={busyId === booking.bookingId} onClick={() => cancel(booking.bookingId)}>{busyId === booking.bookingId ? 'Cancelling…' : 'Cancel booking'}</button></div></article>)}</div> : <Empty title="Your story starts here" text="Browse the films and reserve your first seat." />}</section>
}

function BookingDetailsPage({ bookingId, navigate, notify }) {
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { api(`/bookings/${bookingId}`).then(setBooking).catch((e) => setError(e.message)) }, [bookingId])

  const cancel = async () => {
    if (!window.confirm('Cancel this booking? The seat will become available again.')) return
    setBusy(true)
    try {
      await api(`/bookings/${bookingId}`, { method: 'DELETE' })
      notify('Booking cancelled and seat released')
      navigate('#bookings')
    } catch (error) {
      notify(error.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (error) return <section className="section"><Empty title="Booking unavailable" text={error} /></section>
  if (!booking) return <section className="section"><Loading /></section>
  return <section className="confirmation-page booking-detail"><div className="confirmation-mark">✓</div><p className="eyebrow">BOOKING #{booking.bookingId}</p><h1>{booking.movieTitle}</h1><p className="confirmation-copy">Seat <strong>{booking.seatNumber}</strong> · {formatDate(booking.showTime)}</p><div className="detail-ticket"><span>SHOWTIME<strong>{formatDate(booking.showTime)}</strong></span><span>BOOKED ON<strong>{formatDate(booking.bookingTime)}</strong></span></div><div className="confirmation-actions"><button className="button" onClick={() => navigate('#bookings')}>Back to bookings <span>↗</span></button><button className="cancel-button large" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel booking'}</button></div></section>
}

function AdminPage({ movies, shows, refresh, notify }) { const [movie, setMovie] = useState({ title: '', description: '', duration: '', genre: '' }); const [show, setShow] = useState({ movieId: '', startTime: '', endTime: '' }); const [busy, setBusy] = useState(false); const addMovie = async (e) => { e.preventDefault(); setBusy(true); try { await api('/movies', { method: 'POST', body: JSON.stringify({ ...movie, duration: Number(movie.duration) }) }); setMovie({ title: '', description: '', duration: '', genre: '' }); await refresh(); notify('Movie added to the catalog') } catch (err) { notify(err.message, 'error') } finally { setBusy(false) } }; const addShow = async (e) => { e.preventDefault(); setBusy(true); try { await api('/shows', { method: 'POST', body: JSON.stringify({ movieId: Number(show.movieId), startTime: show.startTime, endTime: show.endTime }) }); setShow({ movieId: '', startTime: '', endTime: '' }); await refresh(); notify('Showtime created with fresh seats') } catch (err) { notify(err.message, 'error') } finally { setBusy(false) } }; return <section className="section admin-page"><div className="section-heading"><div><p className="eyebrow">STAFF AREA</p><h1>Manage cinema</h1></div><span className="admin-badge">ADMIN ACCESS</span></div><div className="admin-grid"><form className="admin-form" onSubmit={addMovie}><p className="eyebrow">CATALOG</p><h2>Add a movie</h2><label>Title<input required value={movie.title} onChange={(e) => setMovie({ ...movie, title: e.target.value })} /></label><label>Genre<input value={movie.genre} onChange={(e) => setMovie({ ...movie, genre: e.target.value })} placeholder="Sci-Fi, Drama…" /></label><label>Duration (minutes)<input required type="number" min="1" value={movie.duration} onChange={(e) => setMovie({ ...movie, duration: e.target.value })} /></label><label>Description<textarea value={movie.description} onChange={(e) => setMovie({ ...movie, description: e.target.value })} rows="3" /></label><button className="button" disabled={busy}>Add movie <span>↗</span></button></form><form className="admin-form" onSubmit={addShow}><p className="eyebrow">PROGRAMMING</p><h2>Create a showtime</h2><label>Movie<select required value={show.movieId} onChange={(e) => setShow({ ...show, movieId: e.target.value })}><option value="">Choose a movie</option>{movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>Starts at<input required type="datetime-local" value={show.startTime} onChange={(e) => setShow({ ...show, startTime: e.target.value })} /></label><label>Ends at<input required type="datetime-local" value={show.endTime} onChange={(e) => setShow({ ...show, endTime: e.target.value })} /></label><button className="button" disabled={busy}>Create showtime <span>↗</span></button><p className="helper">Each new show automatically gets the seeded A1–C5 seat map.</p></form></div><div className="admin-stats"><div><strong>{movies.length}</strong><span>Movies</span></div><div><strong>{shows.length}</strong><span>Showtimes</span></div><div><strong>15</strong><span>Seats per show</span></div></div></section> }

function AdminManagementPage({ movies, shows, refresh, notify }) {
  const emptyMovie = { title: '', description: '', duration: '', genre: '' }; const emptyShow = { movieId: '', startTime: '', endTime: '' }
  const [movie, setMovie] = useState(emptyMovie); const [show, setShow] = useState(emptyShow); const [editingMovie, setEditingMovie] = useState(null); const [editingShow, setEditingShow] = useState(null); const [bookings, setBookings] = useState([]); const [busy, setBusy] = useState(false); const [bookingBusyId, setBookingBusyId] = useState(null)
  useEffect(() => { api('/bookings').then(setBookings).catch((error) => notify(error.message, 'error')) }, [])
  const saveMovie = async (event) => { event.preventDefault(); setBusy(true); try { await api(editingMovie ? `/movies/${editingMovie.id}` : '/movies', { method: editingMovie ? 'PUT' : 'POST', body: JSON.stringify({ ...movie, duration: Number(movie.duration) }) }); setMovie(emptyMovie); setEditingMovie(null); await refresh(); notify(editingMovie ? 'Movie updated' : 'Movie added to the catalog') } catch (error) { notify(error.message, 'error') } finally { setBusy(false) } }
  const saveShow = async (event) => { event.preventDefault(); setBusy(true); try { await api(editingShow ? `/shows/${editingShow.id}` : '/shows', { method: editingShow ? 'PUT' : 'POST', body: JSON.stringify({ movieId: Number(show.movieId), startTime: show.startTime, endTime: show.endTime }) }); setShow(emptyShow); setEditingShow(null); await refresh(); notify(editingShow ? 'Showtime updated' : 'Showtime created with fresh seats') } catch (error) { notify(error.message, 'error') } finally { setBusy(false) } }
  const remove = async (type, id) => { if (!window.confirm(`Delete this ${type}? This cannot be undone.`)) return; try { await api(`/${type === 'movie' ? 'movies' : 'shows'}/${id}`, { method: 'DELETE' }); await refresh(); notify(`${type[0].toUpperCase() + type.slice(1)} deleted`) } catch (error) { notify(error.message, 'error') } }
  const editMovie = (item) => { setEditingMovie(item); setMovie({ title: item.title || '', description: item.description || '', duration: item.duration || '', genre: item.genre || '' }) }
  const editShow = (item) => { setEditingShow(item); setShow({ movieId: item.movie?.id || '', startTime: item.startTime?.slice(0, 16) || '', endTime: item.endTime?.slice(0, 16) || '' }) }
  const cancelBooking = async (bookingId) => { if (!window.confirm('Cancel this booking? The seat will become available again.')) return; setBookingBusyId(bookingId); try { await api(`/bookings/${bookingId}`, { method: 'DELETE' }); setBookings((current) => current.filter((booking) => booking.bookingId !== bookingId)); notify('Booking cancelled and seat released') } catch (error) { notify(error.message, 'error') } finally { setBookingBusyId(null) } }
  return <section className="section admin-page"><div className="section-heading"><div><p className="eyebrow">STAFF AREA</p><h1>Manage cinema</h1></div><span className="admin-badge">ADMIN ACCESS</span></div><div className="admin-grid"><form className="admin-form" onSubmit={saveMovie}><p className="eyebrow">CATALOG</p><h2>{editingMovie ? 'Edit movie' : 'Add a movie'}</h2><label>Title<input required value={movie.title} onChange={(e) => setMovie({ ...movie, title: e.target.value })} /></label><label>Genre<input value={movie.genre} onChange={(e) => setMovie({ ...movie, genre: e.target.value })} placeholder="Sci-Fi, Drama…" /></label><label>Duration (minutes)<input required type="number" min="1" value={movie.duration} onChange={(e) => setMovie({ ...movie, duration: e.target.value })} /></label><label>Description<textarea value={movie.description} onChange={(e) => setMovie({ ...movie, description: e.target.value })} rows="3" /></label><div className="form-actions"><button className="button" disabled={busy}>{editingMovie ? 'Save movie' : 'Add movie'} <span>↗</span></button>{editingMovie && <button type="button" className="text-button" onClick={() => { setEditingMovie(null); setMovie(emptyMovie) }}>Cancel</button>}</div></form><form className="admin-form" onSubmit={saveShow}><p className="eyebrow">PROGRAMMING</p><h2>{editingShow ? 'Edit showtime' : 'Create a showtime'}</h2><label>Movie<select required value={show.movieId} onChange={(e) => setShow({ ...show, movieId: e.target.value })}><option value="">Choose a movie</option>{movies.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select></label><label>Starts at<input required type="datetime-local" value={show.startTime} onChange={(e) => setShow({ ...show, startTime: e.target.value })} /></label><label>Ends at<input required type="datetime-local" value={show.endTime} onChange={(e) => setShow({ ...show, endTime: e.target.value })} /></label><div className="form-actions"><button className="button" disabled={busy}>{editingShow ? 'Save showtime' : 'Create showtime'} <span>↗</span></button>{editingShow && <button type="button" className="text-button" onClick={() => { setEditingShow(null); setShow(emptyShow) }}>Cancel</button>}</div><p className="helper">Each new show automatically gets the seeded A1–C5 seat map.</p></form></div><div className="admin-stats"><div><strong>{movies.length}</strong><span>Movies</span></div><div><strong>{shows.length}</strong><span>Showtimes</span></div><div><strong>{bookings.length}</strong><span>Active bookings</span></div></div><div className="admin-bookings"><div className="list-heading"><div><p className="eyebrow">RESERVATIONS</p><h2>All bookings</h2></div><span>{bookings.length} active</span></div>{bookings.length ? <div className="admin-booking-table">{bookings.map((booking) => <div className="admin-booking-row" key={booking.bookingId}><div><strong>#{booking.bookingId} · {booking.movieTitle}</strong><small>{booking.username} · {formatDate(booking.showTime)} · Seat {booking.seatNumber}</small></div><div><small>{formatDate(booking.bookingTime, false)}</small><button className="cancel-button" disabled={bookingBusyId === booking.bookingId} onClick={() => cancelBooking(booking.bookingId)}>{bookingBusyId === booking.bookingId ? 'Cancelling…' : 'Cancel booking'}</button></div></div>)}</div> : <p className="helper">No active bookings.</p>}</div><div className="admin-lists"><div><div className="list-heading"><h2>Movies</h2><span>{movies.length} records</span></div>{movies.map((item) => <div className="admin-row" key={item.id}><span><strong>{item.title}</strong><small>{item.genre || 'Uncategorized'} · {item.duration} min</small></span><span className="row-actions"><button onClick={() => editMovie(item)}>Edit</button><button onClick={() => remove('movie', item.id)}>Delete</button></span></div>)}</div><div><div className="list-heading"><h2>Showtimes</h2><span>{shows.length} records</span></div>{shows.map((item) => <div className="admin-row" key={item.id}><span><strong>{item.movie?.title || 'Movie'}</strong><small>{formatDate(item.startTime)} → {formatDate(item.endTime).split(', ').pop()}</small></span><span className="row-actions"><button onClick={() => editShow(item)}>Edit</button><button onClick={() => remove('show', item.id)}>Delete</button></span></div>)}</div></div></section>
}

function Gate({ navigate }) { return <section className="empty-state"><div className="empty-mark">✦</div><h2>Come on in</h2><p>Sign in to see your reservations.</p><button className="button" onClick={() => navigate('#login')}>Sign in <span>↗</span></button></section> }
function Empty({ title, text }) { return <div className="empty-state"><div className="empty-mark">✦</div><h2>{title}</h2><p>{text}</p></div> }
function Loading() { return <div className="loading-grid">{[1, 2, 3].map((i) => <div className="skeleton" key={i}></div>)}</div> }

createRoot(document.getElementById('root')).render(<App />)
