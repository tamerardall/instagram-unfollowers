// Instagram: seni geri takip etmeyenleri bulur.
// Kullanım: instagram.com'da giriş yapılmışken F12 > Console'a yapıştır, Enter.
// Salt okunur: yalnızca liste isteklerini yapar, hiçbir şeyi değiştirmez.
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const jitter = () => 1500 + Math.random() * 2000;

  const match = document.cookie.match(/ds_user_id=(\d+)/);
  if (!match) {
    console.error("ds_user_id bulunamadı. instagram.com'da giriş yaptığından emin ol.");
    return;
  }
  const userId = match[1];

  async function fetchAll(kind) {
    const users = new Map();
    let maxId = "";
    let page = 0;
    while (true) {
      const url =
        `https://www.instagram.com/api/v1/friendships/${userId}/${kind}/?count=100` +
        (maxId ? `&max_id=${encodeURIComponent(maxId)}` : "");
      const res = await fetch(url, {
        credentials: "include",
        headers: { "x-ig-app-id": "936619743392459" },
      });
      if (!res.ok) {
        throw new Error(
          `${kind} isteği başarısız: HTTP ${res.status}` +
            (res.status === 429 ? " (rate limit, birkaç saat bekleyip tekrar dene)" : "")
        );
      }
      const data = await res.json();
      for (const u of data.users || []) {
        users.set(u.username.toLowerCase(), { username: u.username, verified: !!u.is_verified });
      }
      page++;
      console.log(`${kind}: sayfa ${page}, toplam ${users.size}`);
      if (!data.next_max_id) break;
      maxId = data.next_max_id;
      await sleep(jitter());
    }
    return users;
  }

  try {
    console.log("Takip edilenler çekiliyor...");
    const following = await fetchAll("following");
    await sleep(jitter());
    console.log("Takipçiler çekiliyor...");
    const followers = await fetchAll("followers");

    const result = [...following.entries()]
      .filter(([key]) => !followers.has(key))
      .map(([, v]) => v)
      .sort((a, b) => a.username.localeCompare(b.username));

    console.log(
      `Takip ettiğin: ${following.size}, takipçin: ${followers.size}, seni takip etmeyen: ${result.length}`
    );
    console.table(result.map((u) => ({ kullanici: u.username, dogrulanmis: u.verified, profil: `https://instagram.com/${u.username}` })));
    try {
      copy(result.map((u) => u.username).join("\n"));
      console.log("Kullanıcı adları panoya kopyalandı.");
    } catch (_) {}
    window.__notFollowingBack = result;
  } catch (e) {
    console.error("Durduruldu, eksik veriyle sonuç üretilmedi:", e.message);
  }
})();
