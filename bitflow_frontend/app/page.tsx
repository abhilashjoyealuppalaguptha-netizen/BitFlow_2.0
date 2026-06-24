"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/sandbox");
    }
  }, [user, loading, router]);

  // Loading screen
  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020609",
          color: "#fff",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  // Logged-in users briefly render nothing while redirecting
  if (user) {
    return null;
  }

  // Guest users see landing page
  return (
  <div
    style={{
      minHeight: "100vh",
      background:
        "radial-gradient(circle at top left, rgba(0,232,122,.08), transparent 40%), #020609",
      color: "#fff",
      overflow: "hidden",
      position: "relative",
    }}
  >
    {/* Stars */}
<div
  style={{
    position: "absolute",
    inset: 0,
    backgroundImage: `
      radial-gradient(white 1px, transparent 1px),
      radial-gradient(white 1px, transparent 1px)
    `,
    backgroundSize: "140px 140px, 220px 220px",
    backgroundPosition: "0 0, 80px 100px",
    opacity: 0.22,
    pointerEvents: "none",
    zIndex: 0,
  }}
/>
{/* Background Logo */}
<img
  src="/bitflow_logo_2.png"
  alt=""
  style={{
    position: "absolute",
    top: "10%",
    left: "50%",
    transform: "translate(-50%, -50%)",

    width: "900px",

    opacity: 0.5,
    filter: "blur(3px)",

    pointerEvents: "none",

    zIndex: 0,
  }}
/>
    {/* Navbar */}
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "24px 80px",
        position: "relative",
        zIndex: 10,
      }}
    >
      <h2
        style={{
          color: "#00e87a",
          fontSize: "1.6rem",
          fontWeight: 700,
        }}
      >
        BitFlow
      </h2>

      <div
        style={{
          display: "flex",
          gap: "32px",
          alignItems: "center",
        }}
      >
        <a href="/login" style={{ color: "#aaa" }}>Learn</a>

        <a href="/login" style={{ color: "#aaa" }}>Arena</a>

        <a href="/login" style={{ color: "#aaa" }}>Sandbox</a>

        <a
          href="/login"
          style={{
            background: "#00e87a",
            color: "#020609",
            padding: "12px 22px",
            borderRadius: "8px",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Get Started
        </a>
      </div>
    </nav>

    {/* Hero */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
        textAlign: "center",
        position:"relative",
        zIndex:10,
      }}
    >
      <div
        style={{
          color: "#00e87a",
          letterSpacing: "3px",
          marginBottom: "20px",
        }}
      >
        THE WORLD'S FIRST HDL CODING PLATFORM
      </div>

      <h1
        style={{
          fontSize: "5rem",
          maxWidth: "1000px",
          lineHeight: 1.05,
          marginBottom: "30px",
        }}
      >
        Master Verilog.
        <br />
        Simulate Instantly.
        <br />
        Build Silicon.
      </h1>

      <p
        style={{
          color: "#888",
          fontSize: "1.2rem",
          maxWidth: "700px",
          lineHeight: 1.8,
        }}
      >
        Learn digital design from logic gates to interview-tier FSMs.
        Browser-based compilation and simulation. No setup required.
      </p>

      <div
        style={{
          marginTop: "50px",
          display: "flex",
          gap: "20px",
        }}
      >
        <a
          href="/login"
          style={{
            background: "#00e87a",
            color: "#020609",
            padding: "18px 32px",
            borderRadius: "10px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          Start Learning
        </a>

        <a
          href="/login"
          style={{
            border: "1px solid rgba(255,255,255,.15)",
            padding: "18px 32px",
            borderRadius: "10px",
            color: "white",
            textDecoration: "none",
          }}
        >
          Open Sandbox
        </a>
      </div>
    </div>
    {/* Stats */}
<div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "80px",
    marginTop: "60px",
    color: "#888",
    fontSize: "14px",
    textAlign: "center",
  }}
>
  <div>
    <h2 style={{ color: "#00e87a" }}>50+</h2>
    Problems
  </div>

  <div>
    <h2 style={{ color: "#00e87a" }}>Instant</h2>
    Simulation
  </div>

  <div>
    <h2 style={{ color: "#00e87a" }}>Browser</h2>
    IDE
  </div>

  <div>
    <h2 style={{ color: "#00e87a" }}>Arena</h2>
    Competition
  </div>
</div>
{/* Journey Heading */}
<div
  style={{
    textAlign: "center",
    marginTop: "120px",
    marginBottom: "70px",
  }}
>
  <h1
    style={{
      fontSize: "4rem",
      marginBottom: "20px",
      fontWeight: 700,
      lineHeight: 1.1,
    }}
  >
    From Logic Gates to Silicon
  </h1>

  <p
    style={{
      color: "#888",
      fontSize: "1.2rem",
      maxWidth: "800px",
      margin: "0 auto",
      lineHeight: 1.8,
    }}
  >
    BitFlow guides students through every stage of digital design,
    from fundamentals to interview-ready RTL engineering.
  </p>
</div>
    
{/* Feature Cards */}
<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: "30px",
    padding: "120px 80px",
    maxWidth: "1400px",
    margin: "0 auto",
  }}
><div
  style={{
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: "24px",
    padding: "40px",
    backdropFilter: "blur(20px)",
  }}
>
  <h2 style={{ color:"#00e87a", marginBottom:"20px" }}>
    Learn
  </h2>

  <h1 style={{ fontSize:"2rem", marginBottom:"20px" }}>
    Structured HDL Academy
  </h1>

  <p style={{ color:"#888", lineHeight:1.8 }}>
    Learn Verilog from logic gates to interview-tier FSM design
    with an XP based learning path.
  </p>
</div><div
  style={{
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: "24px",
    padding: "40px",
    backdropFilter: "blur(20px)",
  }}
>
  <h2 style={{ color:"#00e87a", marginBottom:"20px" }}>
    Sandbox
  </h2>

  <h1 style={{ fontSize:"2rem", marginBottom:"20px" }}>
    Browser IDE
  </h1>

  <p style={{ color:"#888", lineHeight:1.8 }}>
    Write, compile and simulate Verilog instantly.
    No installations. No setup.
  </p>
</div><div
  style={{
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: "24px",
    padding: "40px",
    backdropFilter: "blur(20px)",
  }}
>
  <h2 style={{ color:"#00e87a", marginBottom:"20px" }}>
    Arena
  </h2>

  <h1 style={{ fontSize:"2rem", marginBottom:"20px" }}>
    Interview Tier Problems
  </h1>

  <p style={{ color:"#888", lineHeight:1.8 }}>
    Solve real RTL and FSM challenges designed for
    VLSI interviews and competitions.
  </p>
</div><div
  style={{
    background: "rgba(255,255,255,.03)",
    border: "1px solid rgba(255,255,255,.08)",
    borderRadius: "24px",
    padding: "40px",
    backdropFilter: "blur(20px)",
  }}
>
  <h2 style={{ color:"#00e87a", marginBottom:"20px" }}>
    Academy
  </h2>

  <h1 style={{ fontSize:"2rem", marginBottom:"20px" }}>
    Digital Electronics Foundation
  </h1>

  <p style={{ color:"#888", lineHeight:1.8 }}>
    Build the fundamentals of digital systems, Boolean algebra,
    combinational circuits, sequential logic, counters and finite
    state machines before diving into RTL design.
  </p>
</div></div>
{/* Learning Journey */}
<div
  style={{
    marginTop: "160px",
    padding: "0 80px",
    textAlign: "center",
  }}
>
  <div
    style={{
      color: "#00e87a",
      letterSpacing: "3px",
      marginBottom: "20px",
    }}
  >
    STRUCTURED LEARNING
  </div>

  <h1
    style={{
      fontSize: "4rem",
      marginBottom: "20px",
    }}
  >
    From Logic Gates to Silicon
  </h1>

  <p
    style={{
      color: "#888",
      maxWidth: "850px",
      margin: "0 auto 80px auto",
      lineHeight: 1.8,
      fontSize: "1.1rem",
    }}
  >
    BitFlow takes you through a complete HDL journey —
    from combinational logic and flip-flops to FSMs,
    protocols and interview-tier design problems.
  </p>
</div>
<div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "30px",
    flexWrap: "wrap",
    marginBottom: "150px",
  }}
>

{/* Beginner */}
<div style={{
  width:"280px",
  background:"rgba(255,255,255,.03)",
  border:"1px solid rgba(255,255,255,.08)",
  borderRadius:"18px",
  padding:"30px"
}}>
  <h2 style={{color:"#00e87a"}}>Beginner</h2>
  <p style={{color:"#888",lineHeight:1.8}}>
    Logic gates, combinational circuits and sequential basics.
  </p>
</div>

{/* Intermediate */}
<div style={{
  width:"280px",
  background:"rgba(255,255,255,.03)",
  border:"1px solid rgba(255,255,255,.08)",
  borderRadius:"18px",
  padding:"30px"
}}>
  <h2 style={{color:"#4db8ff"}}>Intermediate</h2>
  <p style={{color:"#888",lineHeight:1.8}}>
    Registers, counters, shift registers and memories.
  </p>
</div>

{/* Advanced */}
<div style={{
  width:"280px",
  background:"rgba(255,255,255,.03)",
  border:"1px solid rgba(255,255,255,.08)",
  borderRadius:"18px",
  padding:"30px"
}}>
  <h2 style={{color:"#ffb84d"}}>Advanced</h2>
  <p style={{color:"#888",lineHeight:1.8}}>
    FSMs, protocols, pipelines and interview-grade RTL.
  </p>
</div>

</div>
{/* Arena Section */}
<div
style={{
marginTop:"180px",
padding:"0 80px",
textAlign:"center"
}}
>

<div
style={{
color:"#ff4f4f",
letterSpacing:"3px",
marginBottom:"20px"
}}
>
HDL ARENA
</div>

<h1
style={{
fontSize:"4rem",
marginBottom:"25px"
}}
>
Interview-Tier Challenges
</h1>

<p
style={{
maxWidth:"800px",
margin:"0 auto",
color:"#888",
lineHeight:1.8,
fontSize:"1.15rem"
}}
>
No hints. No hand-holding.
Solve real FSM and RTL problems designed to prepare
future VLSI engineers.
</p>

</div>
<div
style={{
display:"flex",
justifyContent:"center",
gap:"30px",
marginTop:"60px",
flexWrap:"wrap"
}}
>

<div className="arena-badge">Easy</div>
<div className="arena-badge">Medium</div>
<div className="arena-badge">Hard</div>
<div className="arena-badge">Expert</div>

</div>
<div
style={{
marginTop:"180px",
padding:"0 80px",
textAlign:"center"
}}
>

<div
style={{
color:"#00e87a",
letterSpacing:"3px"
}}
>
BROWSER IDE
</div>

<h1
style={{
fontSize:"4rem",
marginTop:"20px"
}}
>
Write HDL. Simulate Instantly.
</h1>

<p
style={{
maxWidth:"850px",
margin:"40px auto",
lineHeight:1.8,
color:"#888"
}}
>
No installations.
No setup.
Just write Verilog and compile directly in your browser.
</p>

</div>
{/* Footer */}
<div
  style={{
    marginTop: "180px",
    padding: "60px 0",
    borderTop: "1px solid rgba(255,255,255,.08)",
    textAlign: "center",
  }}
>
  <h3
    style={{
      color: "#00e87a",
      fontSize: "1.5rem",
      marginBottom: "16px",
      fontWeight: 700,
    }}
  >
    BitFlow
  </h3>

  <p
    style={{
      color: "#777",
      fontSize: "15px",
      lineHeight: 1.8,
    }}
  >
    Built by <span style={{ color: "#fff" }}>NAVIEL</span>
    <br />
    Empowering the next generation of RTL engineers.
  </p>

  <div
    style={{
      marginTop: "30px",
      color: "#555",
      fontSize: "13px",
    }}
  >
    © 2026 NAVIEL. All rights reserved.
  </div>
</div>
    {/* Glow */}
    <div
      style={{
        position: "absolute",
        bottom: "-300px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "900px",
        height: "900px",
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(0,232,122,.2), transparent 70%)",
        filter: "blur(100px)",
        pointerEvents: "none",
      }}
    />
  </div>
  
);
}