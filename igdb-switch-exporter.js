// igdb-switch-exporter.js
// Nintendo Switch games database exporter from IGDB API
// Node 18+ (fetch 내장) 권장

require('dotenv').config();
const fs = require("fs");
const path = require("path");

// Load credentials from environment variables
const CLIENT_ID = process.env.IGDB_CLIENT_ID;
const CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET;
const OUTPUT_FILE = process.env.OUTPUT_FILE || "switch_games.csv";

// Validate environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Error: Missing IGDB API credentials in .env file");
  console.error("Please set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET in .env file");
  process.exit(1);
}

// ------------------------
// 공통 유틸
// ------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const unixToDate = (ts) => (ts ? new Date(ts * 1000).toISOString().split("T")[0] : "");

// ------------------------
// 토큰 발급 및 자동 재발급
// ------------------------
async function getToken() {
  const url = `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`;
  const resp = await fetch(url, { method: "POST" });
  if (!resp.ok) throw new Error(`토큰 요청 실패: ${resp.status} ${resp.statusText}`);
  const data = await resp.json();
  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

// ------------------------
// IGDB 쿼리 (limit=500 고정, Switch=130)
// language_supports로 한국어 지원 여부 확인
// ------------------------
async function fetchSwitchPage(token, offset = 0, limit = 500) {
  const url = "https://api.igdb.com/v4/games";
  const body = `
    fields name, platforms.*, first_release_date, release_dates.*, category, language_supports.*;
    where platforms = (130);
    sort first_release_date asc;
    limit ${limit};
    offset ${offset};
  `;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Client-ID": CLIENT_ID,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain"
    },
    body,
  });
  return resp;
}

// ------------------------
// 메인: 전체 페이지네이션
// ------------------------
function csvText(value) {
  const text = /^[\t\r\n]|^\s*[=+@＝＋－＠-]/.test(value) ? `\t${value}` : value;
  return `"${text.replace(/"/g, '""')}"`;
}

async function main() {
  const outPath = path.join(__dirname, OUTPUT_FILE);
  const stream = fs.createWriteStream(outPath, { encoding: "utf-8" });

  // CSV 헤더 (새 컬럼 추가)
  stream.write("게임명,지원 플랫폼,전체 첫 발매일,스위치 발매일,한글화 여부,포팅/리마스터 여부,PC 지원 여부\n");

  let { accessToken } = await getToken();

  const PAGE_SIZE = 500; // IGDB 허용 최대
  let offset = 0;
  let total = 0;

  while (true) {
    let resp = await fetchSwitchPage(accessToken, offset, PAGE_SIZE);

    // 토큰 만료(401) 시 1회 재발급 후 재시도
    if (resp.status === 401) {
      const t = await getToken();
      accessToken = t.accessToken;
      resp = await fetchSwitchPage(accessToken, offset, PAGE_SIZE);
    }

    if (!resp.ok) {
      throw new Error(`데이터 요청 실패(offset=${offset}): ${resp.status} ${resp.statusText}`);
    }

    const page = await resp.json();
    if (!page || page.length === 0) break;

    for (const g of page) {
      const name = g.name || "";
      const platforms = g.platforms ? g.platforms.map((p) => p.name).join(" / ") : "";
      const firstRelease = unixToDate(g.first_release_date);

      // 스위치 플랫폼 발매일 추출
      let switchReleaseDate = "";
      if (Array.isArray(g.release_dates)) {
        const switchRelease = g.release_dates.find(rd => rd.platform === 130);
        if (switchRelease && switchRelease.date) {
          switchReleaseDate = unixToDate(switchRelease.date);
        }
      }
      // 스위치 발매일이 없으면 전체 첫 발매일 사용
      if (!switchReleaseDate) {
        switchReleaseDate = firstRelease;
      }

      // 한글화 여부 확인
      let korean = "미지원";
      if (Array.isArray(g.language_supports)) {
        for (const ls of g.language_supports) {
          // Korean language ID is 12 in IGDB
          if (ls.language === 12) {
            // language_support_type: 1=Audio, 2=Subtitles, 3=Interface
            const supportTypes = {
              1: "음성",
              2: "자막",
              3: "인터페이스"
            };
            korean = supportTypes[ls.language_support_type] || "지원";
            break;
          }
        }
      }

      // 포팅/리마스터 여부 판단
      let portRemaster = "오리지널";
      if (g.category !== undefined) {
        // category: 0=main_game, 8=remake, 9=remaster, 10=expanded_game, 11=port, 14=remade
        const portCategories = [8, 9, 10, 11, 14];
        if (portCategories.includes(g.category)) {
          const categoryNames = {
            8: "리메이크",
            9: "리마스터",
            10: "확장판",
            11: "포팅",
            14: "리메이드"
          };
          portRemaster = categoryNames[g.category] || "포팅/리마스터";
        }
      }

      // PC 지원 여부 (platform ID 6 = PC)
      let pcSupport = "미지원";
      if (Array.isArray(g.platforms)) {
        const hasPc = g.platforms.some(p => p.id === 6);
        if (hasPc) {
          pcSupport = "지원";
        }
      }

      // CSV 이스케이프
      const csv = [
        csvText(name),
        csvText(String(platforms)),
        `"${firstRelease}"`,
        `"${switchReleaseDate}"`,
        `"${korean}"`,
        `"${portRemaster}"`,
        `"${pcSupport}"`
      ].join(",") + "\n";

      stream.write(csv);
    }

    total += page.length;
    console.log(`누적 ${total}개 수집… (offset=${offset})`);

    // 다음 페이지
    offset += PAGE_SIZE;

    // Rate limit 완화
    await sleep(400);
  }

  stream.end();
  console.log(`완료: ${outPath}`);
}

main().catch((e) => {
  console.error("에러:", e);
  process.exit(1);
});