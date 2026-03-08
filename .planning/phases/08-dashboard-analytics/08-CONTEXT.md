# Phase 8: Dashboard Analytics - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning
**Source:** User discussion

<domain>
## Phase Boundary

Owners can visualize team trends over time through an analytics dashboard with two distinct views: Team Overview (aggregate) and Individual Member (per-person). Includes summary KPI cards, multiple chart types, and time range filtering.

</domain>

<decisions>
## Implementation Decisions

### Two-View Architecture
- Analytics page has two tabs/views: "Team Overview" and "Individual Member"
- Team Overview is the default view showing aggregate team data
- Individual Member view has a member selector dropdown to pick a specific person

### Team Overview — Summary Cards (top row)
- Submission Rate card: percentage this period with trend arrow (up/down vs previous period)
- Avg Hours/Day card: average with trend arrow
- Stress Distribution card: count of High/Medium/Low members
- Task Completion card: total tasks this period with trend arrow

### Team Overview — Charts
- Submission Rate Over Time: line chart, % of team who submitted each day
- Workload Heatmap: grid of members x days, color-coded by hours (green=normal, yellow=high, red=overload)
- Stress Trend: stacked area chart showing Low/Medium/High distribution over time
- Task Volume by Member: horizontal bar chart ranked by task count

### Individual Member — Summary Cards
- Submission Streak: consecutive days submitted
- Avg Hours: member avg vs team avg comparison
- Stress Pattern: most common stress level + trend direction
- Task Output: avg tasks/day vs team avg

### Individual Member — Charts
- Hours Worked: bar chart with daily hours + team average reference line
- Stress Timeline: line/dot chart showing stress level each day
- Task Breakdown: bar chart of tasks per day
- Submission Calendar: GitHub-style contribution grid (green=submitted, gray=missed)

### Time Range
- Week / Month / Quarter toggle applies to both views
- Week is the default selection

### Claude's Discretion
- Chart library choice (Recharts recommended)
- Color palette for heatmap thresholds
- Responsive layout breakpoints
- API response structure for analytics data
- How to calculate "trend" arrows (compare current period vs previous same-length period)

</decisions>

<specifics>
## Specific Ideas

- Workload heatmap should make it instantly visible who's overloaded: green (<=8hrs), yellow (8-10hrs), red (>10hrs)
- Stress stacked area chart: rising "High" area = visual warning sign for team burnout
- Individual member view: manager clicks a person to see their personal trends, enables data-backed 1-on-1 conversations
- Summary cards should show trend arrows comparing current period vs previous period of same length

</specifics>

<deferred>
## Deferred Ideas

- Export charts as PNG/PDF for presentations
- Alerts/notifications when metrics cross thresholds
- Member ranking/leaderboard view
- Custom date range picker beyond week/month/quarter

</deferred>

---

*Phase: 08-dashboard-analytics*
*Context gathered: 2026-03-09 via user discussion*
