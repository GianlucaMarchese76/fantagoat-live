const fs = require("fs");
const path = require("path");
const https = require("https");

const OUT_DIR = path.join(process.cwd(), "public", "bandiere");

const MAPPA = {
  MES: "mx",
  SUD: "za",
  KOR: "kr",
  CZE: "cz",

  CAN: "ca",
  BOS: "ba",
  QAT: "qa",
  SVI: "ch",

  BRA: "br",
  MAR: "ma",
  HAI: "ht",
  SCO: "gb-sct",

  USA: "us",
  PAR: "py",
  AUS: "au",
  TUR: "tr",

  GER: "de",
  CUR: "cw",
  CIV: "ci",
  ECU: "ec",

  OLA: "nl",
  GIA: "jp",
  SWE: "se",
  TUN: "tn",

  BEL: "be",
  EGY: "eg",
  IRN: "ir",
  NZL: "nz",

  ESP: "es",
  CPV: "cv",
  KSA: "sa",
  URU: "uy",

  FRA: "fr",
  SEN: "sn",
  IRQ: "iq",
  NOR: "no",

  ARG: "ar",
  ALG: "dz",
  AUT: "at",
  JOR: "jo",

  POR: "pt",
  COD: "cd",
  UZB: "uz",
  COL: "co",

  ENG: "gb-eng",
  CRO: "hr",
  GHA: "gh",
  PAN: "pa",
};

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Errore ${response.statusCode}: ${url}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(resolve);
        });
      })
      .on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const [codiceFantagoat, iso] of Object.entries(MAPPA)) {
    const url = `https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3/${iso}.svg`;
    const dest = path.join(OUT_DIR, `${codiceFantagoat}.svg`);

    console.log(`${iso}.svg → ${codiceFantagoat}.svg`);
    await download(url, dest);
  }

  console.log("Bandiere scaricate in public/bandiere");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});