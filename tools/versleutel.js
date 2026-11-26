// Versleutelt het lesmateriaal dat niet openbaar mag staan.
//
// De site staat op GitHub Pages en die repo is openbaar: alles wat als leesbaar bestand in de
// repo staat, kan iedereen lezen. De practicumhandleidingen en de beoordelingsformulieren zijn
// lesmateriaal van de opleiding, dus die gaan versleuteld de repo in. Op GitHub staat dan alleen
// ruis; de site haalt het bestand op en ontsleutelt het in je browser met een wachtwoord dat je
// zelf invoert en dat nergens in de repo staat.
//
// Wat dit wel en niet is: iedereen met het wachtwoord kan alles lezen, want de ruis staat
// openbaar. Het is één gedeeld wachtwoord, geen account per persoon, en een zwak wachtwoord is
// offline te kraken. Daarom: een lange wachtzin, en PBKDF2 met veel iteraties.
//
// AES-256-GCM met een eigen IV per bestand; de sleutel komt uit PBKDF2-SHA256 over het
// wachtwoord met een zout dat één keer wordt vastgelegd. Node schrijft, de browser leest
// (WebCrypto); tests/kluis.test.js controleert dat die twee kanten op elkaar passen.
import { createHash, pbkdf2Sync, randomBytes, randomInt, createCipheriv } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const ITERATIES = 310000;      // OWASP-richtlijn voor PBKDF2-SHA256
export const CONTROLEZIN = "leeromgeving-bml";

// Wat achter het slot gaat. De rest van data/ is eigen tekst (verslagen, doelen, recepten) of
// staat al openbaar, en blijft dus gewoon leesbaar.
export const BEVEILIGD = ["data/protocollen", "data/rubrics"];
export const DOEL = "data/beveiligd";

export const sleutelUit = (wachtwoord, zout) =>
  pbkdf2Sync(wachtwoord, zout, ITERATIES, 32, "sha256");

// IV vooraan, daarachter de ciphertext met de authenticatietag erachter: precies wat WebCrypto
// bij het ontsleutelen verwacht. Base64, zodat het bestand tekst blijft.
export function versleutel(sleutel, data) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sleutel, iv);
  const ct = Buffer.concat([cipher.update(data), cipher.final(), cipher.getAuthTag()]);
  return Buffer.concat([iv, ct]).toString("base64");
}

// De bestandsnaam verraadt anders de titel van elke handleiding; een hash van het pad niet.
const naamVan = pad => createHash("sha256").update(pad).digest("hex").slice(0, 20) + ".enc";

const bestandenIn = map => (existsSync(map) ? readdirSync(map, { withFileTypes: true })
  .filter(d => d.isFile())
  .map(d => `${map}/${d.name}`) : []);

export function bouw(wachtwoord) {
  const zout = randomBytes(16);
  const sleutel = sleutelUit(wachtwoord, zout);

  rmSync(DOEL, { recursive: true, force: true });
  mkdirSync(DOEL, { recursive: true });

  const bestanden = {};
  for (const map of BEVEILIGD) {
    for (const pad of bestandenIn(map)) {
      const naam = naamVan(pad);
      writeFileSync(join(DOEL, naam), versleutel(sleutel, readFileSync(pad)));
      bestanden[pad] = `${DOEL}/${naam}`;
    }
  }

  const manifest = {
    versie: 1,
    uitleg: "Versleuteld lesmateriaal. De sleutel komt uit het wachtwoord; die staat niet in deze "
      + "repo. Zie tools/versleutel.js.",
    afleiding: { algoritme: "PBKDF2-SHA256", iteraties: ITERATIES, zout: zout.toString("base64") },
    controle: versleutel(sleutel, Buffer.from(CONTROLEZIN, "utf8")),
    bestanden
  };
  writeFileSync(`${DOEL}/manifest.json`, JSON.stringify(manifest, null, 1) + "\n");
  return manifest;
}

// De versleutelde bestanden staan openbaar, dus een aanvaller kan het wachtwoord offline raden:
// de enige rem is hoeveel mogelijkheden er zijn. Vijf woorden uit deze lijst is maar ~20 bits —
// met een GPU binnen een paar weken door te rekenen, ook met 310.000 iteraties. De 16 hextekens
// erachter maken er ~84 bits van, en dat is niet meer te doen. randomInt en geen modulo, want
// modulo maakt de eerste woorden van de lijst net iets waarschijnlijker.
const WOORDEN = ["protocol", "pipet", "agarose", "primer", "buffer", "kolonie", "enzym",
  "gradient", "eluaat", "ladder", "cuvet", "plasmide", "ligase", "sequentie", "centrifuge"];

export const nieuwWachtwoord = () =>
  Array.from({ length: 5 }, () => WOORDEN[randomInt(WOORDEN.length)]).join("-")
  + "-" + randomBytes(8).toString("hex");

// --- als script ---
if (process.argv[1]?.replace(/\\/g, "/").endsWith("tools/versleutel.js")) {
  const WACHTWOORDBESTAND = ".wachtwoord";
  let wachtwoord = process.argv[2] || (existsSync(WACHTWOORDBESTAND)
    ? readFileSync(WACHTWOORDBESTAND, "utf8").trim() : "");
  if (!wachtwoord) {
    // Zelf een wachtzin maken is beter dan een zwakke verzinnen. Hij komt in .wachtwoord te
    // staan, dat buiten git blijft; daar lees je hem terug als je hem kwijt bent.
    wachtwoord = nieuwWachtwoord();
    writeFileSync(WACHTWOORDBESTAND, wachtwoord + "\n");
    console.log(`Nieuw wachtwoord gemaakt en in ${WACHTWOORDBESTAND} gezet (buiten git).`);
  }
  const m = bouw(wachtwoord);
  const n = Object.keys(m.bestanden).length;
  console.log(`${n} bestanden versleuteld -> ${DOEL}`);
}
