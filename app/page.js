"use client";
import React, { useState } from "react";

const Icon = ({ children, className = "" }) => (
  <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
    {children}
  </span>
);

const ArrowRight = ({ className = "" }) => <Icon className={className}>→</Icon>;
const Shield = ({ className = "" }) => <Icon className={className}>✓</Icon>;
const Pin = ({ className = "" }) => <Icon className={className}>⌖</Icon>;
const Lock = ({ className = "" }) => <Icon className={className}>🔒</Icon>;
const Phone = ({ className = "" }) => <Icon className={className}>☎</Icon>;
const Mail = ({ className = "" }) => <Icon className={className}>✉</Icon>;
const Menu = ({ className = "" }) => <Icon className={className}>☰</Icon>;
const Close = ({ className = "" }) => <Icon className={className}>×</Icon>;

const serviceCards = [
  {
    title: "Rester chez soi en sécurité",
    text: "Aide à domicile, soins, présence, repas, ménage ou soutien régulier.",
    symbol: "⌂",
    color: "bg-emerald-50 text-emerald-700",
  },
  {
    title: "Trouver un établissement adapté",
    text: "EMS, court séjour ou accompagnement spécialisé lorsque le maintien à domicile devient difficile.",
    symbol: "▦",
    color: "bg-blue-50 text-blue-700",
  },
  {
    title: "Préserver l’autonomie",
    text: "Résidences seniors, appartements protégés et solutions intermédiaires.",
    symbol: "◎",
    color: "bg-sky-50 text-sky-700",
  },
  {
    title: "Soulager les proches",
    text: "Répit, présence temporaire, accompagnement après une chute ou une hospitalisation.",
    symbol: "♡",
    color: "bg-amber-50 text-amber-700",
  },
  {
    title: "Comprendre le financement",
    text: "Assurance maladie, prestations complémentaires, aides cantonales et reste à charge.",
    symbol: "₣",
    color: "bg-emerald-50 text-emerald-700",
  },
];

const benefits = [
  {
    title: "Un choix plus clair",
    text: "Nous vous aidons à comprendre ce qui convient vraiment à la situation de votre proche.",
    symbol: "✓",
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    title: "Un accompagnement humain",
    text: "Vous n’êtes pas seul face aux démarches, aux appels et aux décisions difficiles.",
    symbol: "♡",
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "Des pistes adaptées",
    text: "Nous cherchons des options cohérentes avec les besoins, l’urgence et le cadre de vie souhaité.",
    symbol: "◇",
    color: "bg-amber-100 text-amber-700",
  },
];

const steps = [
  {
    n: "1",
    title: "Parlez-nous de votre proche",
    text: "Décrivez sa situation, son lieu de vie actuel, ses besoins et ce qui vous inquiète.",
    symbol: "☷",
  },
  {
    n: "2",
    title: "Nous clarifions les options",
    text: "Nous vous aidons à comprendre les pistes possibles : domicile, résidence, court séjour, EMS ou soutien spécialisé.",
    symbol: "▤",
  },
  {
    n: "3",
    title: "Vous avancez vers le bon choix",
    text: "Vous recevez une orientation humaine pour décider plus sereinement des prochaines étapes.",
    symbol: "◌",
  },
];

const guideCards = [
  {
    title: "Financer les soins",
    text: "Comprendre LAMal, prestations complémentaires, aides cantonales et reste à charge.",
    symbol: "₣",
  },
  {
    title: "EMS ou aide à domicile ?",
    text: "Les critères pour choisir entre maintien à domicile, court séjour ou EMS.",
    symbol: "⇄",
  },
  {
    title: "Après une hospitalisation",
    text: "Les options possibles lorsqu’un proche ne peut pas rentrer seul à domicile.",
    symbol: "+",
  },
  {
    title: "Alzheimer et démence",
    text: "Les solutions à explorer lorsque la sécurité ou l’autonomie devient difficile.",
    symbol: "◎",
  },
  {
    title: "Court séjour / répit",
    text: "Une solution temporaire pour récupérer, soulager les proches ou attendre une place.",
    symbol: "◷",
  },
];

const providerExamples = [
  {
    category: "EMS",
    location: "Lausanne",
    name: "Fondation La Rozavère",
    area: "Lausanne centre · 1006",
    badge: "Places selon disponibilité",
    icon: "🏥",
    price: "CHF 4’200+",
    priceNote: "/mois indicatif",
    tags: ["Gériatrie", "Soins palliatifs", "Court séjour"],
    tone: "bg-blue-50",
  },
  {
    category: "Spitex privé",
    location: "Tout Vaud",
    name: "Senevita Casa",
    area: "Canton de Vaud entier",
    badge: "Disponible 24h/24",
    icon: "🏠",
    price: "CHF 35–80",
    priceNote: "/heure selon prestations",
    tags: ["Soins infirmiers", "Alzheimer", "LAMal"],
    tone: "bg-emerald-50",
  },
  {
    category: "Résidence senior",
    location: "Riviera",
    name: "Résidence Les Jardins du Léman",
    area: "Vevey / Montreux",
    badge: "Logements adaptés",
    icon: "🌿",
    price: "Sur demande",
    priceNote: "selon logement et services",
    tags: ["Autonomie", "Sécurité", "Services"],
    tone: "bg-amber-50",
  },
  {
    category: "Aide à domicile",
    location: "La Côte",
    name: "Aide & Présence Vaud",
    area: "Nyon · Morges · La Côte",
    badge: "Intervention rapide",
    icon: "🤝",
    price: "CHF 30–65",
    priceNote: "/heure selon besoin",
    tags: ["Repas", "Présence", "Ménage"],
    tone: "bg-sky-50",
  },
];

const providerFilters = ["Tous", "EMS", "Aide à domicile", "Spitex privé", "Lausanne", "Nyon / La Côte", "Vevey / Riviera", "Alzheimer"];

const faqs = [
  {
    q: "ProcheSuisse Vaud est-il gratuit pour les familles ?",
    a: "Oui, la première orientation est gratuite. L’objectif est de vous aider à clarifier les options possibles avant de contacter les prestataires adaptés.",
  },
  {
    q: "Êtes-vous un prestataire médical ?",
    a: "Non. ProcheSuisse Vaud n’est pas un prestataire médical et ne remplace pas l’avis d’un médecin, d’un CMS, d’un service social ou d’un professionnel de santé.",
  },
  {
    q: "Pouvez-vous garantir une place en EMS ?",
    a: "Non. Les admissions et disponibilités dépendent des établissements et des services compétents. Nous aidons à identifier les pistes pertinentes et les bons interlocuteurs.",
  },
  {
    q: "Pouvez-vous aider à comprendre le financement ?",
    a: "Oui, nous pouvons vous aider à comprendre les grandes catégories : assurance maladie, prestations complémentaires, aides cantonales et reste à charge. Nous ne remplaçons pas un conseil officiel ou juridique.",
  },
  {
    q: "Comment choisissez-vous les prestataires ?",
    a: "Nous regardons la localisation, le type de besoin, l’urgence, les services proposés et les informations disponibles. À terme, notre objectif est de vérifier davantage les disponibilités et spécialités.",
  },
  {
    q: "Que faire en cas d’urgence médicale ?",
    a: "En cas d’urgence médicale ou de danger immédiat, contactez le 144 ou un professionnel de santé. ProcheSuisse Vaud n’est pas un service d’urgence.",
  },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-white shadow-sm">
        <div className="absolute left-[8px] top-[8px] h-2.5 w-2.5 rounded-full bg-emerald-600" />
        <div className="absolute right-[8px] top-[8px] h-2.5 w-2.5 rounded-full bg-sky-900" />
        <div className="text-[24px] leading-none text-emerald-700">♡</div>
      </div>
      <div className="leading-tight">
        <div className="text-[22px] font-semibold tracking-tight text-slate-950 sm:text-[28px]">
          ProcheSuisse
        </div>
        <div className="text-[17px] font-medium text-emerald-600 sm:text-[21px]">Vaud</div>
      </div>
    </div>
  );
}

function HeroImage() {
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#fbf1e4] via-[#fffaf2] to-[#eaf4f0] shadow-sm ring-1 ring-slate-100">
      <div className="absolute left-1/2 top-10 h-44 w-72 -translate-x-1/2 rounded-[2rem] bg-white/40" />
      <div className="absolute left-8 top-10 h-40 w-40 rounded-full bg-emerald-50/80" />
      <div className="absolute right-12 top-12 h-36 w-36 rounded-full bg-sky-50/90" />
      <div className="absolute right-12 top-28 h-40 w-5 rounded-full bg-emerald-100/80" />
      <div className="absolute right-24 top-20 h-24 w-4 rounded-full bg-emerald-100/70" />

      <svg
        className="absolute left-1/2 top-16 h-24 w-80 -translate-x-1/2 opacity-70"
        viewBox="0 0 280 90"
        fill="none"
      >
        <path d="M4 65C32 43 52 42 78 55C96 64 112 61 132 38C153 14 169 10 188 33C205 54 226 58 276 18" stroke="#9bb9cd" strokeWidth="3" strokeLinecap="round" />
        <path d="M64 55L88 22L108 54" stroke="#9bb9cd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M128 45L150 14L174 50" stroke="#9bb9cd" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center px-4 pb-0">
        <div className="relative flex w-full max-w-[720px] items-end justify-center gap-1 sm:gap-6">
          <div className="relative flex h-[315px] w-[230px] items-end justify-center">
            <div className="absolute bottom-0 h-[210px] w-[178px] rounded-t-[88px] bg-[#efe1ce] shadow-sm" />
            <div className="absolute top-[58px] h-[86px] w-[86px] rounded-full bg-[#eddcc8]" />
            <div className="absolute top-[36px] h-[60px] w-[86px] rounded-full bg-[#eeeeee]" />
            <div className="absolute top-[78px] h-[54px] w-[100px] rounded-t-full border-t-[18px] border-[#f6f6f6]" />
            <div className="absolute left-[94px] top-[96px] h-2 w-2 rounded-full bg-slate-700" />
            <div className="absolute right-[94px] top-[96px] h-2 w-2 rounded-full bg-slate-700" />
            <div className="absolute top-[116px] h-4 w-9 rounded-b-full border-b-2 border-slate-500" />
            <div className="absolute bottom-[110px] h-10 w-10 rounded-full bg-slate-200" />
          </div>

          <div className="relative flex h-[350px] w-[270px] items-end justify-center">
            <div className="absolute bottom-0 h-[236px] w-[202px] rounded-t-[100px] bg-[#f1e5d8] shadow-sm" />
            <div className="absolute top-[62px] h-[90px] w-[90px] rounded-full bg-[#f0d2bf]" />
            <div className="absolute top-[30px] h-[72px] w-[112px] rounded-full bg-[#8f624f]" />
            <div className="absolute top-[95px] left-[111px] h-2 w-2 rounded-full bg-slate-700" />
            <div className="absolute top-[95px] right-[111px] h-2 w-2 rounded-full bg-slate-700" />
            <div className="absolute top-[116px] h-4 w-9 rounded-b-full border-b-2 border-slate-700" />
            <div className="absolute bottom-[120px] -left-1 h-4 w-36 rotate-[-12deg] rounded-full bg-[#f1e5d8]" />
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white/70 to-transparent" />
    </div>
  );
}

function HeroForm() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    need: "",
    location: "",
    urgency: "",
    situation: "",
    needs: [],
    age: "",
    funding: "",
    details: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    consentContact: false,
    consentMarketing: false,
  });

  const totalSteps = 10;

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleNeed = (value) => {
    setFormData((prev) => {
      const exists = prev.needs.includes(value);
      return {
        ...prev,
        needs: exists ? prev.needs.filter((item) => item !== value) : [...prev.needs, value],
      };
    });
  };

  const next = () => setStep((current) => Math.min(current + 1, totalSteps - 1));
  const back = () => setStep((current) => Math.max(current - 1, 0));

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    console.log("ProcheSuisse Vaud lead", formData);
  };

  const progress = ((step + 1) / totalSteps) * 100;

  if (submitted) {
    return (
      <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-700">✓</div>
        <h3 className="text-2xl font-semibold text-slate-950">Demande reçue</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Merci. Votre demande a bien été enregistrée dans cette démonstration. Pour recevoir les vrais formulaires, il faudra connecter ce formulaire à Formspree, Netlify Forms, Supabase ou un backend.
        </p>
        <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          En cas d’urgence médicale ou de danger immédiat, contactez le 144 ou un professionnel de santé.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="max-w-xs text-xl font-semibold leading-7 text-slate-950 sm:text-2xl">
            Décrivez la situation de votre proche
          </h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {step + 1}/{totalSteps}
          </span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-600 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quelle solution semble la plus proche de votre situation ?</label>
          <div className="mt-4 space-y-3">
            {[
              "Un EMS / établissement médico-social",
              "Une aide à domicile / Spitex privé",
              "Une résidence senior / appartement protégé",
              "Un court séjour / répit",
              "Je ne sais pas encore",
            ].map((option) => (
              <button key={option} type="button" onClick={() => updateField("need", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.need === option ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Où se situe votre proche ?</label>
          <input value={formData.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Ex. Lausanne, Nyon, Morges, Vevey, Yverdon..." className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quelle est l’urgence ?</label>
          <div className="mt-4 space-y-3">
            {["Très urgent — cette semaine", "Dans le mois", "Dans les 3 mois", "Je planifie à l’avance", "Simple renseignement"].map((option) => (
              <button key={option} type="button" onClick={() => updateField("urgency", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.urgency === option ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quelle phrase décrit le mieux la situation ?</label>
          <div className="mt-4 space-y-3">
            {[
              "Mon proche vit seul et ce n’est plus sûr",
              "Sortie d’hôpital prévue ou récente",
              "Chute récente / perte d’autonomie",
              "Troubles cognitifs / Alzheimer / démence",
              "La famille est épuisée ou ne peut plus assurer l’aide nécessaire",
              "Nous voulons anticiper",
              "Autre situation",
            ].map((option) => (
              <button key={option} type="button" onClick={() => updateField("situation", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.situation === option ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quels besoins sont présents ?</label>
          <p className="mt-2 text-xs text-slate-500">Vous pouvez en sélectionner plusieurs.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Aide pour se laver / s’habiller",
              "Aide pour les repas",
              "Aide à la prise de médicaments",
              "Courses / repas / ménage",
              "Compagnie / présence",
              "Transport / rendez-vous médicaux",
              "Mobilité réduite",
              "Fauteuil roulant",
              "Surveillance régulière",
              "Présence de nuit",
              "Soins infirmiers",
              "Troubles cognitifs / Alzheimer / démence",
              "Je ne sais pas encore",
            ].map((option) => (
              <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-5 transition ${formData.needs.includes(option) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
                <input type="checkbox" checked={formData.needs.includes(option)} onChange={() => toggleNeed(option)} className="mt-1" />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quel est l’âge approximatif de la personne concernée ?</label>
          <div className="mt-4 space-y-3">
            {["Moins de 65 ans", "65–74 ans", "75–84 ans", "85 ans et plus", "Je ne sais pas"].map((option) => (
              <button key={option} type="button" onClick={() => updateField("age", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.age === option ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Avez-vous besoin d’aide pour comprendre le financement ?</label>
          <div className="mt-4 space-y-3">
            {["Oui, c’est une inquiétude importante", "Oui, mais ce n’est pas urgent", "Non, nous avons déjà une idée claire", "Je ne sais pas encore"].map((option) => (
              <button key={option} type="button" onClick={() => updateField("funding", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.funding === option ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 7 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Expliquez brièvement la situation</label>
          <textarea value={formData.details} onChange={(e) => updateField("details", e.target.value)} rows={5} placeholder="Exemple : Ma mère vit seule à Lausanne, elle a chuté récemment et nous ne savons pas s’il faut organiser une aide à domicile ou chercher un EMS." className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
        </div>
      )}

      {step === 8 && (
        <div>
          <h4 className="text-base font-semibold text-slate-950">Bonne nouvelle, votre première orientation peut être préparée.</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">Où devons-nous vous contacter ?</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="Prénom" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
            <input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Nom" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
            <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Adresse e-mail" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
            <input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Téléphone — ex. 079 000 00 00" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          </div>
        </div>
      )}

      {step === 9 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Consentement</label>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={formData.consentContact} onChange={(e) => updateField("consentContact", e.target.checked)} className="mt-1" required />
              <span>J’accepte d’être contacté par ProcheSuisse Vaud au sujet de cette demande. Je comprends que ProcheSuisse Vaud n’est pas un prestataire médical et ne remplace pas l’avis d’un professionnel de santé.</span>
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={formData.consentMarketing} onChange={(e) => updateField("consentMarketing", e.target.checked)} className="mt-1" />
              <span>J’accepte de recevoir des conseils et ressources de ProcheSuisse Vaud par e-mail. Je peux me désinscrire à tout moment.</span>
            </label>
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <button type="button" onClick={back} disabled={step === 0} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40">
          Retour
        </button>
        {step < totalSteps - 1 ? (
          <button type="button" onClick={next} className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
            Continuer <ArrowRight className="text-base" />
          </button>
        ) : (
          <button type="submit" className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700">
            Recevoir une orientation personnalisée <ArrowRight className="text-base" />
          </button>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Shield className="text-emerald-600" />
        Sans engagement. Données confidentielles.
      </p>
    </form>
  );
}

export default function ProcheSuisseVaudLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcfbf8] text-slate-900">
      <header className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-10 text-sm font-medium text-slate-700 md:flex lg:text-base">
            <a href="#how" className="hover:text-slate-950">Comment ça marche</a>
            <a href="#services" className="hover:text-slate-950">Services</a>
            <a href="#guide" className="hover:text-slate-950">Guide</a>
            <a href="#contact" className="hover:text-slate-950">Contact</a>
          </nav>

          <a
            href="#form"
            className="hidden rounded-2xl bg-[#123b87] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d2d68] md:inline-flex"
          >
            Recevoir une orientation
          </a>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-2xl md:hidden">
            {mobileMenuOpen ? <Close /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-100 px-5 py-4 md:hidden">
            <div className="flex flex-col gap-4 text-sm font-medium text-slate-700">
              <a href="#how">Comment ça marche</a>
              <a href="#services">Services</a>
              <a href="#guide">Guide</a>
              <a href="#contact">Contact</a>
              <a href="#form" className="rounded-xl bg-[#123b87] px-5 py-3 text-center text-white">
                Recevoir une orientation
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-800">
                <Shield className="text-emerald-700" />
                Orientation humaine et gratuite
              </div>

              <h1 className="mt-8 max-w-2xl text-[44px] font-semibold leading-[1.05] tracking-tight text-[#133169] sm:text-[58px] lg:text-[64px]">
                Trouvez un lieu de vie adapté pour votre proche âgé, sans avancer seul
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
                ProcheSuisse Vaud accompagne les familles dans le canton de Vaud pour comprendre les options possibles, comparer les solutions sérieuses et avancer vers le bon choix : maintien à domicile, résidence senior, court séjour, EMS ou accompagnement spécialisé.
              </p>

              <div className="mt-8 grid max-w-2xl gap-5 sm:grid-cols-3">
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <Shield className="mt-1 text-amber-700" />
                  <span>Indépendant et impartial</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <Pin className="mt-1 text-slate-700" />
                  <span>Spécialiste du canton de Vaud</span>
                </div>
                <div className="flex items-start gap-3 text-sm text-slate-700">
                  <Lock className="mt-1" />
                  <span>Solutions adaptées à votre proche</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
              <HeroImage />
              <div id="form" className="lg:-ml-10">
                <HeroForm />
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
          <h2 className="text-center text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">
            Trouver le bon cadre pour votre proche
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {serviceCards.map((card) => (
              <div key={card.title} className="group rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-[28px] ${card.color}`}>
                  {card.symbol}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#153168]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
                <div className="mt-6 text-xl text-slate-500 transition group-hover:translate-x-1">→</div>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {benefits.map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-5">
                  <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[26px] ${item.color}`}>
                    {item.symbol}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-[#153168]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Découvrir les options</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">
                Exemples de solutions dans le canton de Vaud
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Chaque situation est différente. Voici quelques types de solutions que les familles explorent souvent avec ProcheSuisse Vaud.
              </p>
            </div>
            <a href="#form" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
              Recevoir une orientation →
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {providerFilters.map((filter) => (
              <button key={filter} type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800">
                {filter}
              </button>
            ))}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {providerExamples.map((provider) => (
              <div key={provider.name} className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-200/60">
                <div className={`relative flex h-40 items-center justify-center ${provider.tone}`}>
                  <div className="absolute left-5 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                    <span className="mr-1 text-emerald-500">●</span>
                    {provider.badge}
                  </div>
                  <div className="text-5xl">{provider.icon}</div>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                    {provider.category} · {provider.location}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold leading-6 text-[#153168]">{provider.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">⌖ {provider.area}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {provider.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-50 px-3 py-1 text-xs text-slate-600 ring-1 ring-slate-100">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-[#153168]">{provider.price}</p>
                        <p className="text-xs text-slate-500">{provider.priceNote}</p>
                      </div>
                      <a href="#form" className="rounded-xl bg-[#123b87] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#0d2d68]">
                        Être guidé
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Ces exemples sont présentés à titre indicatif pour illustrer les types de solutions possibles. Les disponibilités, prix et conditions doivent toujours être vérifiés auprès des prestataires ou services compétents.
          </p>
        </section>

        <section id="how" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <h2 className="text-center text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">Comment ça marche</h2>
          <div className="mx-auto mt-3 h-1 w-14 rounded-full bg-emerald-400" />

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.n} className="text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-[34px]">
                  {step.symbol}
                </div>
                <div className="mx-auto -mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {step.n}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#153168]">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="guide" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Comprendre les options</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">
              Soins, accompagnement et financement
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Trouver une solution ne se limite pas à choisir un prestataire. Les familles doivent aussi comprendre les coûts, les aides possibles et les démarches à entreprendre.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {guideCards.map((card) => (
              <div key={card.title} className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f7f3] text-2xl font-semibold text-emerald-700">
                  {card.symbol}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#153168]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
                <div className="mt-5 text-sm font-semibold text-emerald-700">Lire le guide →</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
          <div className="grid gap-8 rounded-[2rem] bg-[#eef4ff] p-7 lg:grid-cols-[0.85fr_1.15fr] lg:p-10">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#123b87]">Phase de lancement</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#163168]">
                Nous construisons ProcheSuisse Vaud avec les premières familles.
              </h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-slate-700">
              <p>
                Le service est actuellement en phase de lancement dans le canton de Vaud. Notre priorité est de comprendre les situations réelles, structurer les options disponibles et construire un service réellement utile pour les familles.
              </p>
              <p className="rounded-2xl bg-white/75 p-4 ring-1 ring-white">
                <strong className="text-slate-950">Important :</strong> ProcheSuisse Vaud n’est pas un prestataire médical, ne garantit pas de place en EMS et ne remplace pas l’avis d’un médecin, d’un CMS, d’un service social ou d’un professionnel de santé.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">Questions fréquentes</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600">
              Les premières questions que les familles se posent lorsqu’un proche âgé commence à avoir besoin d’aide.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {faqs.map((item) => (
              <div key={item.q} className="rounded-[1.5rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
                <h3 className="text-base font-semibold text-[#153168]">{item.q}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <footer id="contact" className="mt-8 border-t border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1.1fr_0.7fr_0.7fr_0.7fr_1fr] lg:px-8">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-6 text-slate-600">
                Votre partenaire de confiance pour trouver un cadre de vie ou un accompagnement adapté à un proche âgé dans le canton de Vaud.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Liens</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Comment ça marche</p>
                <p>Services</p>
                <p>Guide</p>
                <p>Contact</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ressources</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Guide des solutions</p>
                <p>Financement</p>
                <p>Questions fréquentes</p>
                <p>Lexique</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">À propos</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>Qui sommes-nous</p>
                <p>Notre mission</p>
                <p>Indépendance</p>
                <p>Mentions légales</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Besoin d’aide ?</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2"><Phone /> 021 123 45 67</p>
                <p className="flex items-center gap-2"><Mail /> info@prochesuisse-vaud.ch</p>
                <p className="flex items-center gap-2"><Pin /> Lausanne, Vaud</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 bg-[#eef4e7] px-5 py-4 text-center text-xs text-slate-600">
            Vos données sont sécurisées et confidentielles. Nous ne partageons jamais vos informations sans votre accord. · © 2026 ProcheSuisse Vaud – Tous droits réservés.
          </div>
        </footer>
      </main>
    </div>
  );
}
