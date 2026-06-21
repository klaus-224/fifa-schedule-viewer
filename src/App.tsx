import type { ReactNode, TouchEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronRight,
  ExternalLink,
  List,
  Loader2,
  MapPinned,
  MoonStar,
  RotateCcw,
  Search,
  SlidersHorizontal,
  SunMedium,
  X,
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
  isMatchDayPlayed,
  isMatchLive,
  isMatchPlayed,
  groupMatchesByCity,
  groupMatchesByDate,
  parseMatches,
} from "./data";
import { formatMatchTitle, formatTeamWithFlag, getTeamFlag } from "./teams";
import {
  parseStandingsResponse,
  STANDINGS_DATA_PATH,
} from "./standings";
import {
  attachResultsToMatches,
  parseWorldCupResultsResponse,
  parseWorldCupTeamsResponse,
  WORLD_CUP_RESULTS_DATA_PATH,
  WORLD_CUP_TEAMS_DATA_PATH,
} from "./results";
import { applyTheme, getInitialTheme, persistTheme } from "./theme";
import type {
  Match,
  MatchFilters,
  StandingGroup,
  ViewMode,
  WorldCupPlayer,
  WorldCupSquad,
} from "./types";

type SurfaceMode = "schedule" | "overview";
type LoadStatus = "loading" | "ready" | "error";

const WORLD_CUP_SQUADS_DATA_PATH =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.squads.json";
const PLAYER_POSITION_ORDER = ["GK", "DF", "MF", "FW"];

const views: Array<{ id: ViewMode; label: string; icon: typeof List }> = [
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapPinned },
];

function App() {
  const isMobile = useMediaQuery("(max-width: 760px)");
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("schedule");
  const [view, setView] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_FILTERS);
  const [now, setNow] = useState(() => new Date());
  const [theme, setTheme] = useState(getInitialTheme);
  const [showPastGames, setShowPastGames] = useState(false);
  const [standings, setStandings] = useState<StandingGroup[]>([]);
  const [standingsStatus, setStandingsStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [standingsError, setStandingsError] = useState("");
  const [squads, setSquads] = useState<WorldCupSquad[]>([]);
  const [squadsStatus, setSquadsStatus] = useState<LoadStatus>("loading");
  const [squadsError, setSquadsError] = useState("");
  const [selectedRosterMatch, setSelectedRosterMatch] = useState<Match | null>(
    null,
  );

  useEffect(() => {
    fetch("/data/matches.csv")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load schedule CSV: ${response.status}`);
        }
        return response.text();
      })
      .then(async (csv) => {
        const parsedMatches = parseMatches(csv);

        try {
          const [resultsResponse, teamsResponse] = await Promise.all([
            fetch(WORLD_CUP_RESULTS_DATA_PATH),
            fetch(WORLD_CUP_TEAMS_DATA_PATH),
          ]);

          if (!resultsResponse.ok || !teamsResponse.ok) {
            throw new Error("Could not load World Cup results snapshots");
          }

          const [resultsPayload, teamsPayload] = await Promise.all([
            resultsResponse.json(),
            teamsResponse.json(),
          ]);

          setMatches(
            attachResultsToMatches(
              parsedMatches,
              parseWorldCupResultsResponse(resultsPayload),
              parseWorldCupTeamsResponse(teamsPayload),
            ),
          );
        } catch (caught) {
          console.warn(
            caught instanceof Error ? caught.message : "Could not load match scores",
          );
          setMatches(parsedMatches);
        }
        setStatus("ready");
      })
      .catch((caught: unknown) => {
        setError(
          caught instanceof Error ? caught.message : "Unknown CSV load error",
        );
        setStatus("error");
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(STANDINGS_DATA_PATH, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load standings: ${response.status}`);
        }
        return response.json();
      })
      .then((payload: unknown) => {
        setStandings(parseStandingsResponse(payload));
        setStandingsStatus("ready");
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setStandingsError(
          caught instanceof Error ? caught.message : "Unknown standings error",
        );
        setStandingsStatus("error");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch(WORLD_CUP_SQUADS_DATA_PATH, { signal: controller.signal })
      .then((response) => {
        if (response.status === 404) {
          return [];
        }
        if (!response.ok) {
          throw new Error(`Could not load squads: ${response.status}`);
        }
        return response.json();
      })
      .then((payload: unknown) => {
        setSquads(parseWorldCupSquadsResponse(payload));
        setSquadsStatus("ready");
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }
        setSquadsError(
          caught instanceof Error ? caught.message : "Unknown squads error",
        );
        setSquadsStatus("error");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    applyTheme(theme);
    persistTheme(theme);
  }, [theme]);

  const filteredMatches = useMemo(
    () => filterMatches(matches, filters),
    [matches, filters],
  );
  const visibleListMatches = useMemo(
    () =>
      filteredMatches.filter(
        (match) => showPastGames || !isMatchPlayed(match, now),
      ),
    [filteredMatches, now, showPastGames],
  );
  const groupedByDate = useMemo(
    () => groupMatchesByDate(visibleListMatches),
    [visibleListMatches],
  );
  const groupedByCity = useMemo(
    () => groupMatchesByCity(filteredMatches),
    [filteredMatches],
  );

  const options = useMemo(
    () => ({
      teams:
        standings.length > 0
          ? Array.from(
              new Set(
                standings.flatMap((group) =>
                  group.competitorStandings.map(({ competitor }) => competitor.name),
                ),
              ),
            ).sort((a, b) => a.localeCompare(b))
          : Array.from(
              new Set(
                matches.flatMap((match) =>
                  match.teams.split(/\s+vs\.?\s+/i).map((team) => team.trim()),
                ),
              ),
            ).sort((a, b) => a.localeCompare(b)),
      stages: getUniqueOptions(matches, "stage"),
      groups: getUniqueOptions(matches, "group"),
      cities: getUniqueOptions(matches, "city"),
    }),
    [matches, standings],
  );

  const updateFilter = (key: keyof MatchFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const isFiltered = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <main className="app-shell">
      <header className="site-header" aria-label="Primary">
        <div className="header-spacer" aria-hidden="true" />
        <a className="brand" href="#top" aria-label="FIFA Schedule 2026 home">
          <span className="brand-mark">FIFA World Cup 2026 Schedule</span>
        </a>
        <div className="header-actions">
          <button
            className="theme-toggle"
            type="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <SunMedium size={18} aria-hidden="true" />
            ) : (
              <MoonStar size={18} aria-hidden="true" />
            )}
          </button>
          <a className="source-link" href="/data/matches.csv" download>
            CSV
            <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </header>

      <section className="workspace" aria-label="Schedule explorer">
        <div className="surface-switcher-row">
          <nav className="surface-nav" aria-label="Surface switcher">
            {[
              { id: "schedule" as const, label: "Schedule" },
              { id: "overview" as const, label: "Overview" },
            ].map(({ id, label }) => (
              <button
                className={
                  surfaceMode === id ? "surface-nav-item active" : "surface-nav-item"
                }
                key={id}
                type="button"
                onClick={() => setSurfaceMode(id)}
                aria-pressed={surfaceMode === id}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        {surfaceMode === "overview" && (
          <OverviewSection
            isMobile={isMobile}
            standings={standings}
            standingsStatus={standingsStatus}
            standingsError={standingsError}
            squads={squads}
            squadsStatus={squadsStatus}
            squadsError={squadsError}
          />
        )}
        {surfaceMode === "schedule" && (
          <>
            <Filters
              isMobile={isMobile}
              filters={filters}
              options={options}
              isFiltered={isFiltered}
              onChange={updateFilter}
              onReset={() => setFilters(EMPTY_FILTERS)}
            />
            <div className="view-switcher-row">
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
            </div>
          </>
        )}

        {surfaceMode === "schedule" && status === "loading" && <LoadingState />}
        {surfaceMode === "schedule" && status === "error" && (
          <EmptyState title="Schedule could not load" body={error} />
        )}
        {surfaceMode === "schedule" && status === "ready" && filteredMatches.length === 0 && (
          <EmptyState
            title="No matches match those filters"
            body="Reset filters or broaden the search to bring the schedule back."
          />
        )}
        {surfaceMode === "schedule" &&
          status === "ready" &&
          filteredMatches.length > 0 &&
          view === "list" &&
          visibleListMatches.length > 0 && (
            <ListView
              groupedByDate={groupedByDate}
              now={now}
              showPastGames={showPastGames}
              onTogglePastGames={() => setShowPastGames((current) => !current)}
              onSelectMatch={setSelectedRosterMatch}
            />
          )}
        {surfaceMode === "schedule" &&
          status === "ready" &&
          filteredMatches.length > 0 &&
          view === "list" &&
          visibleListMatches.length === 0 && (
            <EmptyState
              title="No live or upcoming matches"
              body="Turn on past games to see finished matches."
            />
          )}
        {surfaceMode === "schedule" &&
          status === "ready" &&
          filteredMatches.length > 0 &&
          view === "calendar" && (
            <CalendarView groupedByDate={groupedByDate} now={now} />
          )}
        {surfaceMode === "schedule" &&
          status === "ready" &&
          filteredMatches.length > 0 &&
          view === "map" && (
            <MapView groupedByCity={groupedByCity} theme={theme} />
        )}
        <MatchRosterDrawer
          open={selectedRosterMatch !== null}
          match={selectedRosterMatch}
          squads={squads}
          status={squadsStatus}
          error={squadsError}
          onClose={() => setSelectedRosterMatch(null)}
        />
      </section>
    </main>
  );
}

function Filters({
  isMobile,
  filters,
  options,
  isFiltered,
  onChange,
  onReset,
}: {
  isMobile: boolean;
  filters: MatchFilters;
  options: { teams: string[]; stages: string[]; groups: string[]; cities: string[] };
  isFiltered: boolean;
  onChange: (key: keyof MatchFilters, value: string) => void;
  onReset: () => void;
}) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const activeFilterCount = useMemo(
    () =>
      [
        filters.query,
        filters.team,
        filters.stage,
        filters.group,
        filters.city,
        filters.startDate,
        filters.endDate,
      ].filter(Boolean).length,
    [filters],
  );

  if (isMobile) {
    return (
      <>
        <div className="mobile-filter-bar" aria-label="Schedule filters">
          <button
            className="mobile-filter-button"
            type="button"
            onClick={() => setIsMobileSheetOpen(true)}
          >
            <Search size={16} aria-hidden="true" />
            <span>{filters.query.trim() ? "Search set" : "Search"}</span>
          </button>
          <button
            className="mobile-filter-button"
            type="button"
            onClick={() => setIsMobileSheetOpen(true)}
          >
            <SlidersHorizontal size={16} aria-hidden="true" />
            <span>
              {activeFilterCount > 0 ? `${activeFilterCount} active` : "Filters"}
            </span>
          </button>
          <button
            className="mobile-filter-button icon-only"
            type="button"
            onClick={onReset}
            disabled={!isFiltered}
            aria-label="Reset filters"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
        <MobileSheet
          open={isMobileSheetOpen}
          onClose={() => setIsMobileSheetOpen(false)}
          eyebrow="Schedule"
          title="Match filters"
          hint="Slide down to close"
        >
          <form
            className="filters filters-sheet"
            onSubmit={(event) => event.preventDefault()}
          >
            <FilterFields
              filters={filters}
              options={options}
              isFiltered={isFiltered}
              onChange={onChange}
              onReset={onReset}
            />
          </form>
        </MobileSheet>
      </>
    );
  }

  return (
    <form className="filters" onSubmit={(event) => event.preventDefault()}>
      <FilterFields
        filters={filters}
        options={options}
        isFiltered={isFiltered}
        onChange={onChange}
        onReset={onReset}
      />
    </form>
  );
}

function FilterFields({
  filters,
  options,
  isFiltered,
  onChange,
  onReset,
}: {
  filters: MatchFilters;
  options: { teams: string[]; stages: string[]; groups: string[]; cities: string[] };
  isFiltered: boolean;
  onChange: (key: keyof MatchFilters, value: string) => void;
  onReset: () => void;
}) {
  return (
    <>
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
        label="Team"
        value={filters.team}
        options={options.teams}
        onChange={(value) => onChange("team", value)}
      />
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
    </>
  );
}

function parseWorldCupSquadsResponse(payload: unknown): WorldCupSquad[] {
  return Array.isArray(payload) ? (payload as WorldCupSquad[]) : [];
}

function normalizeTeamLookupKey(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/[^a-zA-Z0-9'& ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function splitMatchTeams(teams: string): [string, string] | null {
  const parts = teams.split(/\s+vs\.?\s+/i).map((team) => team.trim());
  return parts.length === 2 ? [parts[0], parts[1]] : null;
}

function getSquadForTeam(squads: WorldCupSquad[], team: string, code?: string) {
  const teamKey = normalizeTeamLookupKey(team);
  return squads.find(
    (squad) =>
      (code && squad.fifa_code === code) ||
      normalizeTeamLookupKey(squad.name) === teamKey,
  );
}

function groupPlayersByPosition(players: WorldCupPlayer[]) {
  const groups = players.reduce<Record<string, WorldCupPlayer[]>>(
    (positionGroups, player) => {
      const position = player.pos || "Other";
      positionGroups[position] = positionGroups[position] ?? [];
      positionGroups[position].push(player);
      return positionGroups;
    },
    {},
  );

  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => {
      const positionA = PLAYER_POSITION_ORDER.indexOf(a);
      const positionB = PLAYER_POSITION_ORDER.indexOf(b);
      const rankA = positionA === -1 ? PLAYER_POSITION_ORDER.length : positionA;
      const rankB = positionB === -1 ? PLAYER_POSITION_ORDER.length : positionB;
      return rankA - rankB || a.localeCompare(b);
    }),
  );
}

function OverviewSection({
  isMobile,
  standings,
  standingsStatus,
  standingsError,
  squads,
  squadsStatus,
  squadsError,
}: {
  isMobile: boolean;
  standings: StandingGroup[];
  standingsStatus: "loading" | "ready" | "error";
  standingsError: string;
  squads: WorldCupSquad[];
  squadsStatus: LoadStatus;
  squadsError: string;
}) {
  const [selectedGroup, setSelectedGroup] = useState("");
  const [overviewGroup, setOverviewGroup] = useState("all");
  const [isStandingsSheetOpen, setIsStandingsSheetOpen] = useState(false);
  const [selectedRosterTeam, setSelectedRosterTeam] = useState<{
    name: string;
    code: string;
  } | null>(null);

  const filteredStandings = useMemo(
    () =>
      standings
        .filter((group) => overviewGroup === "all" || group.name === overviewGroup)
        .filter((group) => group.competitorStandings.length > 0),
    [overviewGroup, standings],
  );

  const activeGroup =
    filteredStandings.find((group) => group.name === selectedGroup) ??
    filteredStandings[0];
  const activeRosterSquad = useMemo(() => {
    if (!selectedRosterTeam) {
      return undefined;
    }

    return getSquadForTeam(squads, selectedRosterTeam.name, selectedRosterTeam.code);
  }, [selectedRosterTeam, squads]);

  const openRoster = (name: string, code: string) => {
    setSelectedRosterTeam({ name, code });
  };

  return (
    <section className="overview-section" aria-label="Tournament overview">
      <div className="overview-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h2>Tournament groups and live standings</h2>
        </div>
      </div>
      {standingsStatus === "loading" && (
        <div className="overview-panel">
          <p className="panel-note">Loading standings snapshot...</p>
        </div>
      )}
      {standingsStatus === "error" && (
        <div className="overview-panel">
          <p className="panel-note">{standingsError}</p>
        </div>
      )}
      {standingsStatus === "ready" && activeGroup && (
        <>
          <div className="overview-filters">
            <SelectFilter
              label="Group"
              value={overviewGroup}
              options={standings.map((group) => group.name)}
              onChange={(value) => {
                setOverviewGroup(value);
                setSelectedGroup("");
              }}
            />
            {isMobile && (
              <button
                className="overview-standings-trigger"
                type="button"
                onClick={() => setIsStandingsSheetOpen(true)}
              >
                <List size={16} aria-hidden="true" />
                <span>{activeGroup.name}</span>
                <strong>Standings</strong>
              </button>
            )}
          </div>
          <div className="overview-grid">
            <div className="overview-panel">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Groups</p>
                  <h3>All teams by group</h3>
                </div>
              </div>
              <div className="group-card-grid">
                {filteredStandings.map((group) => (
                  <article
                    className={
                      group.name === activeGroup.name
                        ? "group-card is-active"
                        : "group-card"
                    }
                    key={group.name}
                  >
                    <button
                      className="group-card-selector"
                      type="button"
                      onClick={() => {
                        setSelectedGroup(group.name);
                        if (isMobile) {
                          setIsStandingsSheetOpen(true);
                        }
                      }}
                      aria-pressed={group.name === activeGroup.name}
                    >
                      <strong>{group.name}</strong>
                      <span>{group.competitorStandings.length} teams</span>
                    </button>
                    <div className="group-team-list">
                      {group.competitorStandings.map(({ competitor }) => (
                        <button
                          className={
                            selectedRosterTeam?.code === competitor.shortName
                              ? "group-team-item is-active"
                              : "group-team-item"
                          }
                          key={competitor.name}
                          type="button"
                          onClick={() => {
                            setSelectedGroup(group.name);
                            openRoster(competitor.name, competitor.shortName);
                          }}
                          aria-pressed={selectedRosterTeam?.code === competitor.shortName}
                          aria-label={`Show ${competitor.name} roster`}
                        >
                          <span className="group-team-flag" aria-hidden="true">
                            {getTeamFlag(competitor.name)}
                          </span>
                          <span>{competitor.name}</span>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
            {!isMobile && (
              <div className="overview-panel">
                <StandingsBlock
                  activeGroup={activeGroup}
                  filteredStandings={filteredStandings}
                  onSelectGroup={setSelectedGroup}
                  onSelectRoster={openRoster}
                />
              </div>
            )}
          </div>
          {isMobile && (
            <MobileSheet
              open={isStandingsSheetOpen}
              onClose={() => setIsStandingsSheetOpen(false)}
              eyebrow="Standings"
              title={activeGroup.name}
              hint="Slide down to close"
            >
              <StandingsBlock
                activeGroup={activeGroup}
                filteredStandings={filteredStandings}
                onSelectGroup={setSelectedGroup}
                onSelectRoster={openRoster}
                mobile
              />
            </MobileSheet>
          )}
        </>
      )}
      {standingsStatus === "ready" && filteredStandings.length === 0 && (
        <div className="overview-panel">
          <p className="panel-note">No overview results match that group.</p>
        </div>
      )}
      <RosterDrawer
        open={selectedRosterTeam !== null}
        teamName={selectedRosterTeam?.name ?? ""}
        squad={activeRosterSquad}
        status={squadsStatus}
        error={squadsError}
        onClose={() => setSelectedRosterTeam(null)}
      />
    </section>
  );
}

function RosterDrawer({
  open,
  teamName,
  squad,
  status,
  error,
  onClose,
}: {
  open: boolean;
  teamName: string;
  squad: WorldCupSquad | undefined;
  status: LoadStatus;
  error: string;
  onClose: () => void;
}) {
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="roster-drawer-backdrop" onClick={onClose}>
      <aside
        className="roster-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`${teamName} roster`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="roster-drawer-head">
          <div>
            <p className="eyebrow">Roster</p>
            <h3>{teamName}</h3>
          </div>
          <button
            className="mobile-sheet-close"
            type="button"
            onClick={onClose}
            aria-label={`Close ${teamName} roster`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="roster-drawer-content">
          {status === "loading" && <p className="panel-note">Loading squads...</p>}
          {status === "error" && <p className="panel-note">{error}</p>}
          {status === "ready" && !squad && (
            <p className="panel-note">Roster is not available for this team yet.</p>
          )}
          {status === "ready" && squad && <SquadDetail squad={squad} />}
        </div>
      </aside>
    </div>
  );
}

function MatchRosterDrawer({
  open,
  match,
  squads,
  status,
  error,
  onClose,
}: {
  open: boolean;
  match: Match | null;
  squads: WorldCupSquad[];
  status: LoadStatus;
  error: string;
  onClose: () => void;
}) {
  const teams = match ? splitMatchTeams(match.teams) : null;

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !match) {
    return null;
  }

  return (
    <div className="roster-drawer-backdrop" onClick={onClose}>
      <aside
        className="roster-drawer match-roster-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Match ${match.matchNo} rosters`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="roster-drawer-head">
          <div>
            <p className="eyebrow">Match {match.matchNo}</p>
            <h3>{formatMatchTitle(match.teams)}</h3>
          </div>
          <button
            className="mobile-sheet-close"
            type="button"
            onClick={onClose}
            aria-label={`Close Match ${match.matchNo} rosters`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="roster-drawer-content">
          {status === "loading" && <p className="panel-note">Loading squads...</p>}
          {status === "error" && <p className="panel-note">{error}</p>}
          {status === "ready" && !teams && (
            <p className="panel-note">Rosters are not available for this match.</p>
          )}
          {status === "ready" && teams && (
            <div className="match-roster-grid">
              {teams.map((team) => {
                const squad = getSquadForTeam(squads, team);
                return squad ? (
                  <SquadDetail squad={squad} key={team} />
                ) : (
                  <article className="squad-detail" key={team}>
                    <div className="squad-detail-head">
                      <div>
                        <p className="eyebrow">Roster</p>
                        <h4>{formatTeamWithFlag(team)}</h4>
                      </div>
                    </div>
                    <p className="panel-note">
                      Roster is not available for this team yet.
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function SquadDetail({ squad }: { squad: WorldCupSquad }) {
  const groupedPlayers = groupPlayersByPosition(squad.players);

  return (
    <article className="squad-detail">
      <div className="squad-detail-head">
        <div>
          <p className="eyebrow">Group {squad.group}</p>
          <h4>{formatTeamWithFlag(squad.name)}</h4>
        </div>
        <span>{squad.fifa_code}</span>
      </div>
      {squad.players.length === 0 ? (
        <p className="panel-note">Squad not available yet.</p>
      ) : (
        <div className="position-groups">
          {Object.entries(groupedPlayers).map(([position, players]) => (
            <section className="position-group" key={position}>
              <h5>
                {position}
                <span>{players.length}</span>
              </h5>
              <div className="player-list">
                {players.map((player) => (
                  <div className="player-row" key={`${player.number}-${player.name}`}>
                    <span className="player-number">{player.number}</span>
                    <span className="position-badge">{player.pos}</span>
                    <div>
                      <strong>{player.name}</strong>
                      <span>
                        {player.club.name || "Club TBD"}
                        {player.club.country ? ` - ${player.club.country}` : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </article>
  );
}

function StandingsBlock({
  activeGroup,
  filteredStandings,
  onSelectGroup,
  onSelectRoster,
  mobile = false,
}: {
  activeGroup: StandingGroup;
  filteredStandings: StandingGroup[];
  onSelectGroup: (group: string) => void;
  onSelectRoster: (name: string, code: string) => void;
  mobile?: boolean;
}) {
  return (
    <>
      {!mobile && (
        <div className="panel-head">
          <div>
            <p className="eyebrow">Standings</p>
            <h3>{activeGroup.name}</h3>
          </div>
        </div>
      )}
      <div className="group-tabs" role="tablist" aria-label="Standing groups">
        {filteredStandings.map((group) => (
          <button
            className={
              group.name === activeGroup.name ? "group-tab is-active" : "group-tab"
            }
            key={group.name}
            type="button"
            onClick={() => onSelectGroup(group.name)}
            aria-pressed={group.name === activeGroup.name}
          >
            {group.name.replace("Group ", "")}
          </button>
        ))}
      </div>
      <div className="standings-table standings-table-head" aria-hidden="true">
        <span className="standing-place">#</span>
        <span className="standing-team-label">Team</span>
        <span className="standing-stat">Pts</span>
        <span className="standing-stat">GF-GA</span>
        <span className="standing-stat">Diff</span>
      </div>
      <div className="standings-table">
        {activeGroup.competitorStandings.map(({ competitor, stats }) => (
          <button
            className="standing-row"
            key={competitor.name}
            type="button"
            onClick={() => onSelectRoster(competitor.name, competitor.shortName)}
            aria-label={`Show ${competitor.name} roster`}
          >
            <span className="standing-place">{competitor.place}</span>
            <div className="standing-team">
              <strong>{formatTeamWithFlag(competitor.name)}</strong>
              <span>
                {stats.wins.value}-{stats.draws.value}-{stats.losses.value}
              </span>
            </div>
            <span className="standing-stat">{stats.points.value}</span>
            <span className="standing-stat">
              {stats.goalsFor.value}-{stats.goalsAgainst.value}
            </span>
            <span className="standing-stat">{stats.differential.value}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function MobileSheet({
  open,
  onClose,
  eyebrow,
  title,
  hint,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    startY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (startY.current === null) {
      return;
    }

    const currentY = event.touches[0]?.clientY ?? startY.current;
    const nextOffset = Math.max(0, currentY - startY.current);
    setDragOffset(Math.min(nextOffset, 220));
  };

  const handleTouchEnd = () => {
    if (dragOffset > 90) {
      onClose();
    }
    startY.current = null;
    setDragOffset(0);
  };

  return (
    <div className="mobile-sheet-backdrop" onClick={onClose}>
      <div
        className="mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{ transform: `translateY(${dragOffset}px)` }}
      >
        <div
          className="mobile-sheet-drag-zone"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <span className="mobile-sheet-handle" aria-hidden="true" />
          <span className="mobile-sheet-hint">{hint}</span>
        </div>
        <div className="mobile-sheet-head">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h3>{title}</h3>
          </div>
          <button
            className="mobile-sheet-close"
            type="button"
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="mobile-sheet-content">{children}</div>
      </div>
    </div>
  );
}

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [locked]);
}

function useMediaQuery(query: string) {
  const getMatches = () =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false;

  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const syncMatch = () => setMatches(mediaQuery.matches);

    syncMatch();
    mediaQuery.addEventListener("change", syncMatch);

    return () => mediaQuery.removeEventListener("change", syncMatch);
  }, [query]);

  return matches;
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
  now,
  showPastGames,
  onTogglePastGames,
  onSelectMatch,
}: {
  groupedByDate: Record<string, Match[]>;
  now: Date;
  showPastGames: boolean;
  onTogglePastGames: () => void;
  onSelectMatch: (match: Match) => void;
}) {
  return (
    <div className="list-view">
      <div className="list-toolbar">
        <label className="toggle-field">
          <span>Show past games</span>
          <button
            className={showPastGames ? "switch is-on" : "switch"}
            type="button"
            onClick={onTogglePastGames}
            aria-pressed={showPastGames}
            aria-label="Show past games"
          >
            <span className="switch-thumb" aria-hidden="true" />
          </button>
        </label>
      </div>
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
              <MatchCard
                key={match.matchNo}
                match={match}
                now={now}
                onSelectMatch={onSelectMatch}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function MatchCard({
  match,
  now,
  onSelectMatch,
}: {
  match: Match;
  now: Date;
  onSelectMatch: (match: Match) => void;
}) {
  const played = isMatchPlayed(match, now);
  const live = isMatchLive(match, now);

  return (
    <article
      className={played ? "match-card is-played" : "match-card"}
      role="button"
      tabIndex={0}
      onClick={() => onSelectMatch(match)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectMatch(match);
        }
      }}
      aria-label={`Show rosters for ${formatMatchTitle(match.teams)}`}
    >
      <div className="match-card-top">
        <span className="match-no">Match {match.matchNo}</span>
        <div className="match-badges">
          {live && (
            <span className="live-pill">
              <span className="live-dot" aria-hidden="true" />
              Live
            </span>
          )}
          <span className="stage-pill">{match.group || match.stage}</span>
        </div>
      </div>
      <h4>{formatMatchTitleWithScore(match)}</h4>
      <div className="match-meta">
        <span>{match.stage}</span>
        <span>{match.stadium}</span>
        <span>{match.city}</span>
      </div>
      <div className="time-grid">
        <div>
          <strong>{formatLocalTime(match.utcDateTime)}</strong>
        </div>
      </div>
      <div className="card-actions">
        <a
          href={match.officialFifaSchedulePdf}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          FIFA PDF
          <ChevronRight size={15} aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}

function getScoreTeams(match: Match): [string, string] | null {
  const teams = match.teams.split(/\s+vs\.?\s+/i).map((team) => team.trim())
  return teams.length === 2 ? [teams[0], teams[1]] : null
}

function formatMatchTitleWithScore(match: Match) {
  if (!match.score) return formatMatchTitle(match.teams)

  const teams = getScoreTeams(match)
  if (!teams) return formatMatchTitle(match.teams)

  return `${formatTeamWithFlag(teams[0])} ${match.score.home}-${match.score.away} ${formatTeamWithFlag(teams[1])}`
}

function CalendarView({
  groupedByDate,
  now,
}: {
  groupedByDate: Record<string, Match[]>;
  now: Date;
}) {
  return (
    <div className="calendar-view">
      <MonthCalendar
        year={2026}
        monthIndex={5}
        groupedByDate={groupedByDate}
        now={now}
      />
      <MonthCalendar
        year={2026}
        monthIndex={6}
        groupedByDate={groupedByDate}
        now={now}
      />
    </div>
  );
}

function MonthCalendar({
  year,
  monthIndex,
  groupedByDate,
  now,
}: {
  year: number;
  monthIndex: number;
  groupedByDate: Record<string, Match[]>;
  now: Date;
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
          const fullyPlayed = isMatchDayPlayed(matches, now);
          return (
            <div
              className={
                matches.length > 0
                  ? fullyPlayed
                    ? "day-cell has-match is-played"
                    : "day-cell has-match"
                  : "day-cell"
              }
              key={date ?? `blank-${index}`}
              aria-disabled={fullyPlayed || undefined}
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
                    {matches.map((match) =>
                      isMatchPlayed(match, now) ? (
                        <span
                          className="day-match-link is-played"
                          key={match.matchNo}
                        >
                          {formatMatchTitle(match.teams)}
                        </span>
                      ) : (
                        <a
                          href={match.matchSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          key={match.matchNo}
                          className="day-match-link"
                        >
                          {formatMatchTitle(match.teams)}
                        </a>
                      ),
                    )}
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
  theme,
}: {
  groupedByCity: Record<string, Match[]>;
  theme: "light" | "dark";
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={
            theme === "dark"
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          key={theme}
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
                      {formatMonthDay(match.date)} -{" "}
                      {formatMatchTitle(match.teams)}
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
