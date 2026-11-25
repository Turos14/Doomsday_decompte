const JOUR_MS = 24 * 60 * 60 * 1000;

// Date locale à minuit (évite le décalage UTC de new Date("AAAA-MM-JJ"))
function minuitLocal(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Date(a, m - 1, j);
}

const debut = minuitLocal(CONFIG.DEBUT);
const doomsday = new Date(CONFIG.DOOMSDAY);

function dateOuverture(index) {
  const d = new Date(debut);
  d.setDate(d.getDate() + index);
  return d;
}

function nbOuvertes(maintenant) {
  if (CONFIG.TEST) return CASES.length;
  let n = 0;
  while (n < CASES.length && dateOuverture(n) <= maintenant) n++;
  return n;
}

// ---------- Grille ----------
const grid = document.getElementById("grid");
let dernierEtat = -1;

function rendreGrille() {
  const ouvertes = nbOuvertes(new Date());
  if (ouvertes === dernierEtat) return;
  dernierEtat = ouvertes;

  grid.innerHTML = "";
  CASES.forEach((_, i) => {
    const b = document.createElement("button");
    b.className = "case";
    const ouverte = i < ouvertes;
    if (ouverte) {
      b.classList.add("ouverte");
      if (i === ouvertes - 1) b.classList.add("aujourdhui");
      b.innerHTML = `${i + 1}<small>déc.</small>`;
      b.addEventListener("click", () => ouvrirModal(i));
    } else {
      b.innerHTML = `🔒<small>${i + 1} déc.</small>`;
      b.disabled = true;
      b.title = "Se débloque le " + dateOuverture(i).toLocaleDateString("fr-FR");
    }
    grid.appendChild(b);
  });
}

// ---------- Modale ----------
const modal = document.getElementById("modal");
const modalLink = document.getElementById("modal-link");
const modalPhoto = document.getElementById("modal-photo");
const modalVideo = document.getElementById("modal-video");

function ouvrirModal(i) {
  const c = CASES[i];
  document.getElementById("modal-day").textContent =
    dateOuverture(i).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("modal-title").textContent = c.titre;
  modalLink.classList.remove("desactive");
  modalLink.removeAttribute("download");
  modalLink.removeAttribute("target");
  modalVideo.pause();
  modalVideo.hidden = true;
  modalVideo.removeAttribute("src");
  if (c.video) {
    modalPhoto.hidden = true;
    modalPhoto.removeAttribute("src");
    modalVideo.hidden = false;
    modalVideo.src = c.video;
    modalLink.href = c.video;
    modalLink.setAttribute("download", c.video.split("/").pop());
    modalLink.textContent = "Télécharger la vidéo";
  } else if (c.photo) {
    modalPhoto.hidden = false;
    modalPhoto.src = c.photo;
    modalPhoto.alt = c.titre;
    modalLink.href = c.photo;
    modalLink.setAttribute("download", c.photo.split("/").pop());
    modalLink.textContent = "Télécharger la photo";
  } else {
    modalPhoto.hidden = true;
    modalPhoto.removeAttribute("src");
    if (c.lien) {
      modalLink.href = c.lien;
      modalLink.target = "_blank";
      modalLink.textContent = "Voir la vidéo";
    } else {
      modalLink.removeAttribute("href");
      modalLink.classList.add("desactive");
      modalLink.textContent = "Bientôt disponible";
    }
  }
  modal.hidden = false;
}

// Vidéo absente du dossier img/
modalVideo.addEventListener("error", () => {
  if (!modalVideo.getAttribute("src")) return;
  modalVideo.hidden = true;
  modalLink.removeAttribute("href");
  modalLink.classList.add("desactive");
  modalLink.textContent = "Vidéo bientôt disponible";
});

// Photo absente du dossier img/ : on le signale au lieu d'une image cassée
modalPhoto.addEventListener("error", () => {
  if (!modalPhoto.getAttribute("src")) return;
  modalPhoto.hidden = true;
  modalLink.removeAttribute("href");
  modalLink.classList.add("desactive");
  modalLink.textContent = "Photo bientôt disponible";
});

function fermerModal() {
  modal.hidden = true;
  modalVideo.pause();
}
document.getElementById("modal-close").addEventListener("click", fermerModal);
modal.addEventListener("click", (e) => { if (e.target === modal) fermerModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermerModal(); });

// ---------- Compte à rebours ----------
const pad = (n) => String(n).padStart(2, "0");

function majCompteur() {
  const maintenant = new Date();
  let reste = Math.max(0, doomsday - maintenant);
  const j = Math.floor(reste / JOUR_MS); reste %= JOUR_MS;
  const h = Math.floor(reste / 3600000); reste %= 3600000;
  const m = Math.floor(reste / 60000); reste %= 60000;
  const s = Math.floor(reste / 1000);
  document.getElementById("cd-j").textContent = j;
  document.getElementById("cd-h").textContent = pad(h);
  document.getElementById("cd-m").textContent = pad(m);
  document.getElementById("cd-s").textContent = pad(s);

  const ouvertes = nbOuvertes(maintenant);
  const next = document.getElementById("next");
  if (doomsday <= maintenant) {
    next.textContent = "DOOMSDAY EST ARRIVÉ !";
  } else if (CONFIG.TEST) {
    next.textContent = "MODE TEST : toutes les cases sont ouvertes";
  } else if (ouvertes < CASES.length) {
    next.textContent = "Prochaine case : le " +
      dateOuverture(ouvertes).toLocaleDateString("fr-FR", { day: "numeric", month: "long" }) + " à minuit";
  } else {
    next.textContent = "Toutes les cases sont ouvertes";
  }

  rendreGrille();
}

majCompteur();
setInterval(majCompteur, 1000);

// ---------- Films à voir ----------
const CLE_VUS = "doomsday-films-vus";

function lireVus() {
  try { return JSON.parse(localStorage.getItem(CLE_VUS)) || []; } catch { return []; }
}

function rendreFilms() {
  const vus = new Set(lireVus());
  const liste = document.getElementById("films");
  liste.innerHTML = "";
  FILMS.forEach((f, i) => {
    const li = document.createElement("li");
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = vus.has(f.titre);
    cb.addEventListener("change", () => {
      cb.checked ? vus.add(f.titre) : vus.delete(f.titre);
      try { localStorage.setItem(CLE_VUS, JSON.stringify([...vus])); } catch {}
      majProgression(vus);
    });
    const titre = document.createElement("span");
    titre.textContent = `${i + 1}. ${f.titre}`;
    label.append(cb, titre);
    if (f.note) {
      const note = document.createElement("small");
      note.textContent = f.note;
      label.append(note);
    }
    li.append(label);
    if (f.lien) {
      const a = document.createElement("a");
      a.href = f.lien;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = "infos";
      a.setAttribute("aria-label", "Infos sur " + f.titre);
      li.append(a);
    }
    liste.append(li);
  });
  majProgression(vus);
}

function majProgression(vus) {
  const n = FILMS.filter((f) => vus.has(f.titre)).length;
  document.getElementById("films-progression").textContent = `${n} / ${FILMS.length} vus`;
}

rendreFilms();

// ---------- Personnages confirmés ----------
function rendrePersonnages() {
  const bloc = document.getElementById("persos");
  let total = 0;
  PERSONNAGES.forEach((g) => {
    const titre = document.createElement("h3");
    titre.textContent = g.groupe;
    const ul = document.createElement("ul");
    g.membres.forEach((m) => {
      const li = document.createElement("li");
      const nom = document.createElement("span");
      nom.textContent = m.nom;
      const acteur = document.createElement("small");
      acteur.textContent = m.acteur;
      li.append(nom, acteur);
      ul.append(li);
      total++;
    });
    bloc.append(titre, ul);
  });
  document.getElementById("persos-total").textContent = `${total} personnages`;
}

rendrePersonnages();

// ---------- PWA ----------
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

let promptInstall;
const btnInstall = document.getElementById("install");
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  promptInstall = e;
  btnInstall.hidden = false;
});
btnInstall.addEventListener("click", async () => {
  if (!promptInstall) return;
  promptInstall.prompt();
  await promptInstall.userChoice;
  promptInstall = null;
  btnInstall.hidden = true;
});
