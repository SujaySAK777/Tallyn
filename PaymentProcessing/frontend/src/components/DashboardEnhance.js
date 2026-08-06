// DashboardEnhanced.js
// -----------------------------------------------------------------------
// Drop this file next to Dashboard.js. It does NOT modify Dashboard.js or
// Dashboard.css — it just re-exports the original Dashboard after loading
// the extra stylesheet, so the enhancements apply automatically wherever
// this file is imported instead of Dashboard.js.
//
// Usage: in App.js (or wherever you currently do this)
//   import Dashboard from './Dashboard';
// change it to
//   import Dashboard from './DashboardEnhanced';
// -----------------------------------------------------------------------

import Dashboard from '../Dashboard';
import './ScheduleGroupsplitEnhance.css';

export default Dashboard;
