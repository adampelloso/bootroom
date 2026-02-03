import React, { useState, useEffect } from 'react';

const customStyles = {
  trendUp: {
    transform: 'rotate(-45deg)',
    display: 'inline-block'
  },
  trendDown: {
    transform: 'rotate(45deg)',
    display: 'inline-block'
  }
};

const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"></path>
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d="M5 17.59L15.59 7H9V5h10v10h-2V8.41L6.41 19 5 17.59z"></path>
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d="M19 6.41L8.41 17H15v2H5V9h2v6.59L17.59 5 19 6.41z"></path>
  </svg>
);

const CircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"></path>
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"></path>
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zM12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"></path>
  </svg>
);

const ListIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"></path>
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"></path>
  </svg>
);

const FilterChip = ({ children, active, onClick }) => {
  const className = `filter-chip ${active ? 'active' : 'inactive'}`;
  const style = {
    padding: '10px 20px',
    borderRadius: '999px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    border: active ? 'none' : '1px solid #EEEEEE',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: active ? '#000000' : 'transparent',
    color: active ? '#FFFFFF' : '#000000'
  };
  
  return (
    <button className={className} style={style} onClick={onClick}>
      {children}
    </button>
  );
};

const MatchCard = ({ match }) => {
  return (
    <div className="match-card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      paddingBottom: '20px',
      borderBottom: '1px solid #EEEEEE'
    }}>
      <div className="match-header" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div className="league-icon" style={{
          width: '44px',
          height: '44px',
          background: match.iconBg || '#F5F5F5',
          color: match.iconColor || '#000000',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative'
        }}>
          {match.trend === 'up' && (
            <span style={customStyles.trendUp}>
              <ArrowUpIcon />
            </span>
          )}
          {match.trend === 'down' && (
            <span style={customStyles.trendDown}>
              <ArrowDownIcon />
            </span>
          )}
          {!match.trend && <CircleIcon />}
        </div>
        <div className="match-info" style={{ flex: 1 }}>
          <div className="match-teams" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span className="text-md font-semibold uppercase" style={{
              fontSize: '15px',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>{match.team1}</span>
            <span className="text-xs text-mono text-secondary" style={{
              fontSize: '11px',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#666666',
              letterSpacing: '0.5px'
            }}>vs {match.team2}</span>
          </div>
        </div>
        <div className="match-meta" style={{
          textAlign: 'right',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '2px'
        }}>
          <span className="text-md font-mono stat-value" style={{
            fontSize: '15px',
            fontFamily: "'JetBrains Mono', monospace",
            fontFeatureSettings: '"tnum" on, "zero" on'
          }}>{match.time}</span>
          <span className="text-xs text-secondary" style={{
            fontSize: '11px',
            color: '#666666',
            letterSpacing: '0.5px'
          }}>{match.date}</span>
        </div>
      </div>
      <div className="insight-box" style={{
        background: '#F5F5F5',
        padding: '12px 20px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginTop: '4px'
      }}>
        <div className="insight-marker" style={{
          width: '6px',
          height: '6px',
          background: '#000000',
          borderRadius: '50%',
          marginTop: '6px',
          flexShrink: 0
        }}></div>
        <div>
          <p className="text-sm font-medium" style={{
            fontSize: '13px',
            fontWeight: 500,
            lineHeight: 1.5
          }}>{match.insight}</p>
          <p className="text-xs text-secondary text-mono mt-1" style={{
            fontSize: '11px',
            color: '#666666',
            fontFamily: "'JetBrains Mono', monospace",
            marginTop: '4px',
            letterSpacing: '0.5px'
          }}>{match.insightMeta}</p>
        </div>
      </div>
    </div>
  );
};

const FeaturedCard = () => {
  return (
    <div className="featured-card" style={{
      background: '#F0F0F0',
      borderRadius: '24px',
      padding: '20px',
      height: '240px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }}>
      <div className="shape-abstract" style={{
        position: 'absolute',
        right: '-20px',
        bottom: '-20px',
        width: '180px',
        height: '180px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #e0e0e0 0%, #ffffff 100%)',
        zIndex: 1
      }}></div>
      <div className="shape-abstract-2" style={{
        position: 'absolute',
        top: '40px',
        right: '40px',
        width: '80px',
        height: '80px',
        borderRadius: '20px',
        background: '#d4d4d4',
        transform: 'rotate(15deg)',
        zIndex: 1
      }}></div>
      <div className="featured-content" style={{
        position: 'relative',
        zIndex: 2
      }}>
        <div className="text-mono text-xs uppercase" style={{
          background: '#000',
          color: '#fff',
          display: 'inline-block',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>Weekly Report</div>
        <div>
          <h3 className="text-xl font-medium uppercase mt-2" style={{
            fontSize: '32px',
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '-1px',
            lineHeight: 1.1,
            marginTop: '8px'
          }}>Corner<br />Stats</h3>
          <p className="text-sm text-secondary mt-2" style={{
            fontSize: '13px',
            color: '#666666',
            marginTop: '8px',
            maxWidth: '60%'
          }}>Detailed breakdown of corner kick efficiency across top 6.</p>
        </div>
        <button className="menu-btn" style={{
          background: '#fff',
          width: '48px',
          height: '48px',
          marginTop: 'auto',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer'
        }}>
          <ArrowRightIcon />
        </button>
      </div>
    </div>
  );
};

const FloatingNav = ({ activeNav, onNavChange }) => {
  return (
    <div className="floating-nav" style={{
      position: 'fixed',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 100
    }}>
      <div className="nav-pill" style={{
        height: '56px',
        background: '#FFFFFF',
        borderRadius: '999px',
        padding: '0 6px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div className={`nav-item ${activeNav === 'home' ? 'active' : ''}`} style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: '0.2s',
          background: activeNav === 'home' ? '#000000' : 'transparent',
          color: activeNav === 'home' ? '#FFFFFF' : '#000000'
        }} onClick={() => onNavChange('home')}>
          <HomeIcon />
        </div>
        <div className={`nav-item ${activeNav === 'time' ? 'active' : ''}`} style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: '0.2s',
          background: activeNav === 'time' ? '#000000' : 'transparent',
          color: activeNav === 'time' ? '#FFFFFF' : '#000000'
        }} onClick={() => onNavChange('time')}>
          <ClockIcon />
        </div>
        <div className={`nav-item ${activeNav === 'list' ? 'active' : ''}`} style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: '0.2s',
          background: activeNav === 'list' ? '#000000' : 'transparent',
          color: activeNav === 'list' ? '#FFFFFF' : '#000000'
        }} onClick={() => onNavChange('list')}>
          <ListIcon />
        </div>
      </div>
      <div className="menu-btn" style={{
        width: '56px',
        height: '56px',
        background: '#fff',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
      }}>
        <ChevronUpIcon />
      </div>
    </div>
  );
};

const App = () => {
  const [activeFilter, setActiveFilter] = useState('All Matches');
  const [activeNav, setActiveNav] = useState('home');

  const filters = ['All Matches', 'High xG', 'Corners', 'Cards', 'Goals'];

  const matches = [
    {
      team1: 'Liverpool',
      team2: 'Man City',
      time: '17:30',
      date: 'Today',
      trend: 'up',
      insight: 'O2.5 Goals in 8/L10 H2H',
      insightMeta: 'Probability: 78% • Odds: 1.65'
    },
    {
      team1: 'Arsenal',
      team2: 'Tottenham',
      time: '12:30',
      date: 'Tomorrow',
      trend: 'down',
      iconBg: '#000',
      iconColor: '#fff',
      insight: 'Both sides avg 10+ corners L5',
      insightMeta: 'Trend: High • Volatility: Low'
    },
    {
      team1: 'Chelsea',
      team2: 'Aston Villa',
      time: '15:00',
      date: 'Sun',
      trend: null,
      insight: 'Aston Villa scored 1H in 4/5',
      insightMeta: 'Value Pick • Odds: 2.10'
    }
  ];

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        -webkit-font-smoothing: antialiased;
      }

      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .filters::-webkit-scrollbar {
        display: none;
      }

      .filters {
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      color: '#000000',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: '16px',
      lineHeight: 1.4,
      maxWidth: '480px',
      margin: '0 auto',
      borderLeft: '1px solid #EEEEEE',
      borderRight: '1px solid #EEEEEE',
      minHeight: '100vh',
      paddingBottom: '100px',
      position: 'relative'
    }}>
      <header style={{
        padding: '32px 20px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div>
          <div className="header-top" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px'
          }}>
            <button className="menu-btn" style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#F5F5F5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              cursor: 'pointer'
            }}>
              <MenuIcon />
            </button>
            <div className="user-pill uppercase" style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '999px',
              background: '#F5F5F5',
              display: 'flex',
              alignItems: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              fontWeight: 500,
              textTransform: 'uppercase'
            }}>Prem League</div>
          </div>
          <h1 className="text-xl font-medium" style={{
            fontSize: '32px',
            fontWeight: 500,
            letterSpacing: '-1px',
            lineHeight: 1.1
          }}>Match Feed</h1>
        </div>
        <div className="text-mono text-lg font-medium stat-value header-top" style={{
          marginBottom: 0,
          marginTop: '10px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '18px',
          fontWeight: 500,
          letterSpacing: '-0.5px',
          fontFeatureSettings: '"tnum" on, "zero" on'
        }}>
          12 OCT
        </div>
      </header>

      <div className="filters" style={{
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        padding: '0 20px 32px',
        scrollbarWidth: 'none'
      }}>
        {filters.map((filter) => (
          <FilterChip
            key={filter}
            active={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </FilterChip>
        ))}
      </div>

      <div className="section-header" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0 20px 20px'
      }}>
        <span className="text-mono text-xs uppercase text-tertiary" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          textTransform: 'uppercase',
          color: '#999999',
          letterSpacing: '0.5px'
        }}>Upcoming • Live</span>
        <span className="text-mono text-xs uppercase font-medium" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          textTransform: 'uppercase',
          fontWeight: 500,
          letterSpacing: '0.5px',
          cursor: 'pointer'
        }}>View Schedule</span>
      </div>

      <div className="feed" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        padding: '0 20px'
      }}>
        {matches.map((match, index) => (
          <MatchCard key={index} match={match} />
        ))}
      </div>

      <div className="section-header" style={{
        marginTop: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0 20px 20px'
      }}>
        <span className="text-mono text-xs uppercase text-tertiary" style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          textTransform: 'uppercase',
          color: '#999999',
          letterSpacing: '0.5px'
        }}>Analysis</span>
      </div>

      <div className="featured-section" style={{
        marginTop: '0',
        padding: '0 20px'
      }}>
        <FeaturedCard />
      </div>

      <FloatingNav activeNav={activeNav} onNavChange={setActiveNav} />
    </div>
  );
};

export default App;