export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", maxWidth: 640, margin: "4rem auto", padding: "0 1rem" }}>
      <h1>EA Pro Clubs Proxy</h1>
      <p>
        Private proxy for <code>proclubs.ea.com</code>. Used by the Pro Clubs API on Coolify when
        datacenter IPs are blocked.
      </p>
      <p>
        Example: <code>/api/ea/allTimeLeaderboard/search?platform=common-gen5&amp;clubName=vibe</code>
      </p>
    </main>
  );
}
