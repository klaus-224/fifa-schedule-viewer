import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  List,
  Loader2,
  MapPinned,
  RotateCcw,
  Search,
} from "lucide-react";
import { DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { CITY_LOCATIONS } from "./cities";
import {
  EMPTY_FILTERS,
  calendarDays,
  filterMatches,
  formatLocalTime,
  formatLongDate,
  formatMonthDay,
  getUniqueOptions,
  groupMatchesByCity,
  groupMatchesByDate,
  parseMatches,
} from "./data";
import type { Match, MatchFilters, ViewMode } from "./types";

const views: Array<{ id: ViewMode; label: string; icon: typeof List }> = [
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapPinned },
];

function App() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_FILTERS);

  useEffect(() => {
    fetch("/data/matches.csv")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load schedule CSV: ${response.status}`);
        }
        return response.text();
      })
      .then((csv) => {
        setMatches(parseMatches(csv));
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : "Unknown CSV load error",
        );
        setStatus("error");
      });
  }, []);

  const filteredMatches = useMemo(
    () => filterMatches(matches, filters),
    [matches, filters],
  );
  const groupedByDate = useMemo(
    () => groupMatchesByDate(filteredMatches),
    [filteredMatches],
  );
  const groupedByCity = useMemo(
    () => groupMatchesByCity(filteredMatches),
    [filteredMatches],
  );

  const options = useMemo(
    () => ({
      stages: getUniqueOptions(matches, "stage"),
      groups: getUniqueOptions(matches, "group"),
      cities: getUniqueOptions(matches, "city"),
    }),
    [matches],
  );

  const updateFilter = (key: keyof MatchFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <main className="app-shell">
      <header className="site-header" aria-label="Primary">
        <a className="brand" href="#top" aria-label="FIFA Schedule 2026 home">
          <span className="brand-mark">Fifa World Cup 2026 Schedule</span>
        </a>
        <nav className="view-nav" aria-label="View switcher">
          {views.map(({ id, label, icon: Icon }) => (
            <button
              className={view === id ? "nav-item active" : "nav-item"}
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-pressed={view === id}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <a className="source-link" href="/data/matches.csv" download>
          CSV
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </header>

      <section className="workspace" aria-label="Schedule explorer">
        <Filters
          filters={filters}
          options={options}
          isFiltered={isFiltered}
          onChange={updateFilter}
          onReset={() => setFilters(EMPTY_FILTERS)}
        />

        {status === "loading" && <LoadingState />}
        {status === "error" && (
          <EmptyState title="Schedule could not load" body={error} />
        )}
        {status === "ready" && filteredMatches.length === 0 && (
          <EmptyState
            title="No matches match those filters"
            body="Reset filters or broaden the search to bring the schedule back."
          />
        )}
        {status === "ready" &&
          filteredMatches.length > 0 &&
          view === "list" && <ListView groupedByDate={groupedByDate} />}
        {status === "ready" &&
          filteredMatches.length > 0 &&
          view === "calendar" && <CalendarView groupedByDate={groupedByDate} />}
        {status === "ready" && filteredMatches.length > 0 && view === "map" && (
          <MapView groupedByCity={groupedByCity} />
        )}
      </section>
    </main>
  );
}

function Filters({
  filters,
  options,
  isFiltered,
  onChange,
  onReset,
}: {
  filters: MatchFilters;
  options: { stages: string[]; groups: string[]; cities: string[] };
  isFiltered: boolean;
  onChange: (key: keyof MatchFilters, value: string) => void;
  onReset: () => void;
}) {
  return (
    <form className="filters" onSubmit={(event) => event.preventDefault()}>
      <label className="search-field">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search schedule</span>
        <input
          value={filters.query}
          onChange={(event) => onChange("query", event.target.value)}
          placeholder="Search teams, venues, cities..."
        />
      </label>
      <SelectFilter
        label="Stage"
        value={filters.stage}
        options={options.stages}
        onChange={(value) => onChange("stage", value)}
      />
      <SelectFilter
        label="Group"
        value={filters.group}
        options={options.groups}
        onChange={(value) => onChange("group", value)}
      />
      <SelectFilter
        label="City"
        value={filters.city}
        options={options.cities}
        onChange={(value) => onChange("city", value)}
      />
      <label className="date-filter">
        <span>From</span>
        <input
          type="date"
          value={filters.startDate}
          onChange={(event) => onChange("startDate", event.target.value)}
        />
      </label>
      <label className="date-filter">
        <span>To</span>
        <input
          type="date"
          value={filters.endDate}
          onChange={(event) => onChange("endDate", event.target.value)}
        />
      </label>
      <button
        className="reset-button"
        type="button"
        onClick={onReset}
        disabled={!isFiltered}
      >
        <RotateCcw size={16} aria-hidden="true" />
        Reset
      </button>
    </form>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="select-filter">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ListView({
  groupedByDate,
}: {
  groupedByDate: Record<string, Match[]>;
}) {
  return (
    <div className="list-view">
      {Object.entries(groupedByDate).map(([date, matches]) => (
        <section className="date-group" key={date}>
          <div className="date-heading">
            <p>
              {matches.length} {matches.length === 1 ? "match" : "matches"}
            </p>
            <h3>{formatLongDate(date)}</h3>
          </div>
          <div className="match-grid">
            {matches.map((match) => (
              <MatchCard key={match.matchNo} match={match} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  return (
    <article className="match-card">
      <div className="match-card-top">
        <span className="match-no">Match {match.matchNo}</span>
        <span className="stage-pill">{match.group || match.stage}</span>
      </div>
      <h4>{match.teams}</h4>
      <div className="match-meta">
        <span>{match.stage}</span>
        <span>{match.stadium}</span>
        <span>{match.city}</span>
      </div>
      <div className="time-grid">
        <div>
          <span>Schedule local</span>
          <strong>
            {match.date} at {match.time}
          </strong>
        </div>
        <div>
          <span>Your time</span>
          <strong>{formatLocalTime(match.utcDateTime)}</strong>
        </div>
      </div>
      <div className="card-actions">
        <a href={match.matchSourceUrl} target="_blank" rel="noreferrer">
          Match source
          <ChevronRight size={15} aria-hidden="true" />
        </a>
        <a
          href={match.officialFifaSchedulePdf}
          target="_blank"
          rel="noreferrer"
        >
          FIFA PDF
          <ChevronRight size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function CalendarView({
  groupedByDate,
}: {
  groupedByDate: Record<string, Match[]>;
}) {
  return (
    <div className="calendar-view">
      <MonthCalendar year={2026} monthIndex={5} groupedByDate={groupedByDate} />
      <MonthCalendar year={2026} monthIndex={6} groupedByDate={groupedByDate} />
    </div>
  );
}

function MonthCalendar({
  year,
  monthIndex,
  groupedByDate,
}: {
  year: number;
  monthIndex: number;
  groupedByDate: Record<string, Match[]>;
}) {
  const label = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));

  return (
    <section className="month-panel">
      <h3>{label}</h3>
      <div className="weekday-row" aria-hidden="true">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="calendar-grid">
        {calendarDays(year, monthIndex).map((date, index) => {
          const matches = date ? (groupedByDate[date] ?? []) : [];
          return (
            <div
              className={matches.length > 0 ? "day-cell has-match" : "day-cell"}
              key={date ?? `blank-${index}`}
            >
              {date && (
                <span className="day-number">{Number(date.slice(-2))}</span>
              )}
              {matches.length > 0 && (
                <details>
                  <summary>
                    {matches.length}{" "}
                    {matches.length === 1 ? "match" : "matches"}
                  </summary>
                  <div className="day-matches">
                    {matches.map((match) => (
                      <a
                        href={match.matchSourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        key={match.matchNo}
                      >
                        <strong>{match.time}</strong>
                        {match.teams}
                      </a>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MapView({
  groupedByCity,
}: {
  groupedByCity: Record<string, Match[]>;
}) {
  const markerIcon = new DivIcon({
    className: "city-marker",
    html: "<span></span>",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
    <div className="map-layout">
      <MapContainer
        center={[38.5, -96]}
        zoom={4}
        scrollWheelZoom
        className="map-canvas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {Object.entries(groupedByCity).map(([city, matches]) => {
          const location = CITY_LOCATIONS[city];
          if (!location) return null;
          return (
            <Marker
              icon={markerIcon}
              key={city}
              position={[location.lat, location.lng]}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{location.label}</strong>
                  <span>{matches.length} matches</span>
                  {matches.slice(0, 6).map((match) => (
                    <a
                      href={match.matchSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      key={match.matchNo}
                    >
                      {formatMonthDay(match.date)} - {match.teams}
                    </a>
                  ))}
                  {matches.length > 6 && <em>+ {matches.length - 6} more</em>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <aside className="city-list" aria-label="Matches by city">
        {Object.entries(groupedByCity)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([city, matches]) => (
            <div className="city-row" key={city}>
              <span>{city}</span>
              <strong>{matches.length}</strong>
            </div>
          ))}
      </aside>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="state-panel">
      <Loader2 className="spin" size={28} aria-hidden="true" />
      <p>Loading the bundled CSV schedule...</p>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="state-panel">
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export default App;
