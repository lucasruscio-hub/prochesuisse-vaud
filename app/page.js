"use client";
import React, { useState } from "react";
import {
  ClipboardList,
  MessageCircle,
  Search,
  HeartHandshake,
  PhoneCall,
  MailIcon,
  MapPin,
  ShieldCheck,
} from "lucide-react";
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
    title: "Trouver un EMS",
    eyebrow: "Établissement médico-social",
    text: "Comprendre les critères d’admission, les coûts et les possibilités disponibles dans le canton de Vaud.",
    symbol: "▦",
    href: "#form", // future page: /ems
    color: "bg-[#FFE1DE] text-[#E64B60]",
  },
  {
    title: "Organiser une aide à domicile",
    eyebrow: "Maintien à domicile",
    text: "Explorer les solutions de présence, repas, ménage, accompagnement et soutien quotidien.",
    symbol: "⌂",
    href: "#form", // future page: /aide-domicile
    color: "bg-[#EEF4FF] text-[#153168]",
  },
  {
    title: "Choisir une résidence senior",
    eyebrow: "Logement adapté",
    text: "Découvrir les appartements protégés et résidences permettant de préserver l’autonomie.",
    symbol: "◎",
    href: "#form", // future page: /residence-senior
    color: "bg-[#FFF4D8] text-[#9A6500]",
  },
  {
    title: "Comprendre le Spitex privé",
    eyebrow: "Soins à domicile",
    text: "Distinguer les prestations privées, les soins pris en charge, la disponibilité et les tarifs.",
    symbol: "⇄",
    href: "#form", // future page: /spitex
    color: "bg-[#EEF7F3] text-[#27634E]",
  },
  {
    title: "Trouver un court séjour ou du répit",
    eyebrow: "Solution temporaire",
    text: "Après une hospitalisation, une chute ou lorsque les proches ont temporairement besoin de soutien.",
    symbol: "♡",
    href: "#form", // future page: /court-sejour
    color: "bg-[#FFF0EF] text-[#E64B60]",
  },
  {
    title: "Alzheimer et démence",
    eyebrow: "Accompagnement spécialisé",
    text: "Identifier les solutions adaptées lorsque la mémoire, la sécurité ou l’autonomie deviennent difficiles.",
    symbol: "◌",
    href: "#form", // future page: /alzheimer
    color: "bg-[#F2EEFF] text-[#5C4B8A]",
  },
];



const steps = [
  {
    n: "1",
    title: "Vous remplissez le formulaire",
    text: "Quelques questions simples nous permettent de comprendre la situation de votre proche.",
    Icon: ClipboardList,
  },
  {
    n: "2",
    title: "Nous comprenons vos besoins",
    text: "Nous analysons votre demande avec attention, sans jugement et sans engagement.",
    Icon: MessageCircle,
  },
  {
    n: "3",
    title: "Nous identifions les options adaptées",
    text: "Nous recherchons les solutions les plus pertinentes dans le canton de Vaud.",
    Icon: Search,
  },
  {
    n: "4",
    title: "Vous avancez sereinement",
    text: "Vous recevez une orientation claire et restez libre de choisir la prochaine étape.",
    Icon: HeartHandshake,
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
    tone: "bg-[#FFF0EF]",
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
    name: "Service d’aide à domicile partenaire",
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
    q: "Lia est-il gratuit pour les familles ?",
    a: "Oui, la première orientation est gratuite. L’objectif est de vous aider à clarifier les options possibles avant de contacter les prestataires adaptés.",
  },
  {
    q: "Êtes-vous un prestataire médical ?",
    a: "Non. Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un médecin, d’un CMS, d’un service social ou d’un professionnel de santé.",
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
    a: "En cas d’urgence médicale ou de danger immédiat, contactez le 144 ou un professionnel de santé. Lia n’est pas un service d’urgence.",
  },
];

function Logo() {
  return (
    <div className="leading-tight">
      <div className="relative inline-block">
        <span className="font-serif text-[48px] font-semibold leading-none tracking-tight text-[#17233A]">
          Lia
        </span>
        <span className="absolute -right-10 top-1 text-[30px] leading-none text-rose-400">
          ❧
        </span>
      </div>
      <div className="mt-1 max-w-[160px] text-[15px] leading-5 text-[#17233A]">
        Accompagnement pour vos proches, en Suisse.
      </div>
    </div>
  );
}

function HeroImage() {
  return (
    <div className="relative min-h-[620px] overflow-hidden">
      <img
  src="/hero-lia.png"
  alt="Une femme accompagnant un proche âgé dans un cadre chaleureux"
  className="h-full min-h-[620px] w-full object-cover object-center"
/>

      <div className="absolute inset-0 bg-gradient-to-r from-[#FFF8F3] via-[#FFF8F3]/35 to-transparent" />
<div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#FFF8F3] to-transparent" />

      <div className="absolute bottom-10 left-10 max-w-sm rounded-[2rem] bg-white/90 p-6 shadow-2xl shadow-slate-300/30 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-2xl text-[#FF5F72]">
            ♡
          </div>

          <p className="text-sm leading-7 text-[#10213D]">
            Chaque situation est unique. Nous sommes là pour vous écouter et vous guider, sans engagement.
          </p>
        </div>
      </div>
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

  const getStepError = () => {
  if (step === 0 && !formData.need) return "Veuillez sélectionner une option.";
  if (step === 1 && !formData.location.trim()) return "Veuillez indiquer la commune ou la région.";
  if (step === 2 && !formData.urgency) return "Veuillez sélectionner l’urgence.";
  if (step === 3 && !formData.situation) return "Veuillez sélectionner la phrase la plus proche.";
  if (step === 5 && !formData.age) return "Veuillez indiquer l’âge approximatif.";
  if (step === 6 && !formData.funding) return "Veuillez répondre à la question sur le financement.";
  if (step === 8 && !formData.firstName.trim()) return "Veuillez indiquer votre prénom.";
  if (step === 8 && !formData.lastName.trim()) return "Veuillez indiquer votre nom.";
  if (step === 8 && !formData.email.trim()) return "Veuillez indiquer votre adresse e-mail.";
  if (step === 8 && !formData.phone.trim()) return "Veuillez indiquer votre téléphone.";
  if (step === 9 && !formData.consentContact) return "Veuillez accepter d’être contacté au sujet de cette demande.";
  return "";
};

const next = () => {
  const error = getStepError();

  if (error) {
    setSubmitError(error);
    return;
  }

  setSubmitError("");
  setStep((current) => Math.min(current + 1, totalSteps - 1));
};
  const back = () => {
  setSubmitError("");
  setStep((current) => Math.max(current - 1, 0));
};

const [isSubmitting, setIsSubmitting] = useState(false);
const [submitError, setSubmitError] = useState("");

const handleSubmit = async (event) => {
  event.preventDefault();
  setIsSubmitting(true);
  setSubmitError("");

  try {
    const response = await fetch("/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...formData,
        source: "landing",
        page: "homepage",
      }),
    });

    if (!response.ok) {
      throw new Error("Impossible d’envoyer la demande.");
    }

    setSubmitted(true);
  } catch (error) {
    setSubmitError(
      "Une erreur est survenue. Veuillez réessayer ou nous contacter directement."
    );
  } finally {
    setIsSubmitting(false);
  }
};

  const progress = ((step + 1) / totalSteps) * 100;

  if (submitted) {
    return (
      <div className="rounded-[2rem] bg-white p-7 shadow-xl shadow-slate-200/60 ring-1 ring-slate-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0EF] text-2xl text-[#E64B60]">✓</div>
        <h3 className="text-2xl font-semibold text-slate-950">Demande reçue</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Merci, votre demande a bien été reçue.

Nous allons examiner les informations transmises afin de mieux comprendre la situation de votre proche et préparer une première orientation.

Lia n’est pas un service d’urgence. 
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
          <span className="rounded-full bg-[#FFF0EF] px-3 py-1 text-xs font-semibold text-[#E64B60]">
            {step + 1}/{totalSteps}
          </span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#FF5F72] transition-all duration-300" style={{ width: `${progress}%` }} />
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
              <button key={option} type="button" onClick={() => updateField("need", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.need === option ? "border-[#FF5F72] bg-[#FFF0EF] text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Où se situe votre proche ?</label>
          <input value={formData.location} onChange={(e) => updateField("location", e.target.value)} placeholder="Ex. Lausanne, Nyon, Morges, Vevey, Yverdon..." className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-[#FFD8D4]" />
        </div>
      )}

      {step === 2 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Quelle est l’urgence ?</label>
          <div className="mt-4 space-y-3">
            {["Très urgent — cette semaine", "Dans le mois", "Dans les 3 mois", "Je planifie à l’avance", "Simple renseignement"].map((option) => (
              <button key={option} type="button" onClick={() => updateField("urgency", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.urgency === option ? "border-[#FF5F72] bg-[#FFF0EF] text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
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
              <button key={option} type="button" onClick={() => updateField("situation", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.situation === option ? "border-[#FF5F72] bg-[#FFF0EF] text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
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
              <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-5 transition ${formData.needs.includes(option) ? "border-[#FF5F72] bg-[#FFF0EF] text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
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
              <button key={option} type="button" onClick={() => updateField("age", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.age === option ? "border-[#FF5F72] bg-[#FFF0EF] text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
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
              <button key={option} type="button" onClick={() => updateField("funding", option)} className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${formData.funding === option ? "border-[#FF5F72] bg-[#FFF0EF] text-emerald-900" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200"}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 7 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Expliquez brièvement la situation</label>
          <textarea value={formData.details} onChange={(e) => updateField("details", e.target.value)} rows={5} placeholder="Exemple : Ma mère vit seule à Lausanne, elle a chuté récemment et nous ne savons pas s’il faut organiser une aide à domicile ou chercher un EMS." className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-[#FFD8D4]" />
        </div>
      )}

      {step === 8 && (
        <div>
          <h4 className="text-base font-semibold text-slate-950">Bonne nouvelle, votre première orientation peut être préparée.</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">Où devons-nous vous contacter ?</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <input value={formData.firstName} onChange={(e) => updateField("firstName", e.target.value)} placeholder="Prénom" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-[#FFD8D4]" />
            <input value={formData.lastName} onChange={(e) => updateField("lastName", e.target.value)} placeholder="Nom" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-[#FFD8D4]" />
            <input type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} placeholder="Adresse e-mail" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-[#FFD8D4]" />
            <input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Téléphone — ex. 079 000 00 00" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-[#FFD8D4]" />
          </div>
        </div>
      )}

      {step === 9 && (
        <div>
          <label className="block text-base font-semibold text-slate-950">Consentement</label>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={formData.consentContact} onChange={(e) => updateField("consentContact", e.target.checked)} className="mt-1" required />
              <span>J’accepte d’être contacté par Lia au sujet de cette demande. Je comprends que Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un professionnel de santé.</span>
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
              <input type="checkbox" checked={formData.consentMarketing} onChange={(e) => updateField("consentMarketing", e.target.checked)} className="mt-1" />
              <span>J’accepte de recevoir des conseils et ressources de Lia par e-mail. Je peux me désinscrire à tout moment.</span>
            </label>
          </div>
        </div>
      )}
{submitError && (
  <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
    {submitError}
  </p>
)}
      <div className="mt-6 flex items-center justify-between gap-4">
        <button type="button" onClick={back} disabled={step === 0} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-40">
          Retour
        </button>
        {step < totalSteps - 1 ? (
          <button type="button" onClick={next} className="ml-auto flex items-center justify-center gap-2 rounded-2xl bg-[#FF5F72] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-[#E64B60]">
            Continuer <ArrowRight className="text-base" />
          </button>
        ) : (
          <button type="submit" className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-[#FF5F72] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#E64B60]">
            {isSubmitting ? "Envoi en cours..." : "Recevoir une orientation personnalisée"} <ArrowRight className="text-base" />
          </button>
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-slate-500">
        <Shield className="text-[#FF5F72]" />
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
  className="inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-9 py-5 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:bg-[#E64B60]"
>
  Faire une demande <ArrowRight />
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
        <section className="relative mx-auto min-h-[720px] max-w-[1450px] overflow-hidden px-6 py-14 lg:px-10 lg:py-20">
          <div className="grid items-center gap-16 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="relative z-10 max-w-[650px]">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF0EF] px-5 py-3 text-sm font-semibold text-[#E64B60]">
                <Shield className="text-[#E64B60]" />
                Orientation humaine et gratuite
              </div>

             <h1 className="font-serif text-5xl font-semibold leading-[1.05] tracking-[-0.04em] text-[#10213D] sm:text-6xl lg:text-7xl">
  Vous accompagnez
  <br />
  un proche âgé ?
</h1>

<div className="mt-2 h-2 w-40 rounded-full bg-[#FF7A87]" />

              <p className="mt-9 max-w-xl text-lg leading-8 text-[#10213D]">
  Lia vous aide à trouver le cadre de vie ou l’accompagnement le plus adapté,
  dans tout le canton de Vaud.
</p>

<div className="mt-9 flex flex-wrap items-center gap-6">
  <a
    href="#form"
    className="inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-[#E64B60]"
  >
    Faire une demande <ArrowRight />
  </a>

  <a
    href="#how"
    className="text-sm font-semibold text-[#10213D] underline decoration-[#FF7A87] decoration-2 underline-offset-8"
  >
    En savoir plus ↓
  </a>
</div>
</div>

<div className="mt-12 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:w-[58%]">
  <HeroImage />
</div>
</div>
</section>
<section className="relative z-20 mx-auto -mt-12 max-w-6xl px-5 lg:px-8">
  <div className="grid overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-rose-100/60 ring-1 ring-[#F1DDD7] sm:grid-cols-2 lg:grid-cols-4">
    {[
      {
        symbol: "♡",
        title: "Confidentiel",
        text: "Vos informations restent privées.",
      },
      {
        symbol: "✓",
        title: "Indépendant",
        text: "Aucun établissement privilégié.",
      },
      {
        symbol: "♧",
        title: "Humain",
        text: "Un accompagnement à taille humaine.",
      },
      {
        symbol: "⌖",
        title: "Dans le canton de Vaud",
        text: "Des solutions locales adaptées.",
      },
    ].map((item, index) => (
      <div
        key={item.title}
        className={`flex items-start gap-4 p-6 ${
          index < 3 ? "lg:border-r lg:border-[#F1DDD7]" : ""
        }`}
      >
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFE1DE] text-2xl text-[#FF5F72]">
          {item.symbol}
        </div>

        <div>
          <h3 className="font-semibold text-[#10213D]">{item.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
        </div>
      </div>
    ))}
  </div>
</section>
<section
  id="how"
  className="relative overflow-hidden border-b border-[#F3E3DE] bg-[#FFF4EF]"
>
  <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-[#FFD8D4]/50 blur-3xl" />
  <div className="absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-white/70 blur-3xl" />

  <div className="relative mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
        Simple et humain
      </p>

      <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
        Comment ça marche
      </h2>

      <div className="mx-auto mt-3 h-1.5 w-16 rounded-full bg-[#FF7A87]" />

      <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600">
        Lia vous accompagne étape par étape afin de rendre une situation
        souvent complexe plus claire et plus rassurante.
      </p>
    </div>

    <div className="relative mt-14">
      <div className="absolute left-[12%] right-[12%] top-12 hidden border-t-2 border-dashed border-[#FF9AA6] lg:block" />

      <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => {
          const StepIcon = step.Icon;

          return (
            <div key={step.n} className="relative text-center">
              <div className="relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#FFF9F6] text-[#10213D] shadow-lg shadow-rose-100/70 ring-1 ring-[#F1DDD7]">
                <StepIcon size={35} strokeWidth={1.7} />
              </div>

              <div className="relative z-20 mx-auto -mt-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5F72] text-sm font-bold text-white shadow-md shadow-rose-200">
                {step.n}
              </div>

              <h3 className="mx-auto mt-6 max-w-[230px] text-lg font-semibold leading-6 text-[#10213D]">
                {step.title}
              </h3>

              <p className="mx-auto mt-3 max-w-[250px] text-sm leading-6 text-slate-600">
                {step.text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  </div>
</section>
        <section
  id="services"
  className="border-y border-[#F3E3DE] bg-[#FFF9F6]"
>
  <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-24">
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
        Comprendre les solutions
      </p>

      <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
        Une solution adaptée à chaque situation
      </h2>

      <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
        Lia vous aide à comprendre les différentes possibilités et à
        identifier celles qui correspondent réellement aux besoins de votre
        proche.
      </p>
    </div>

    <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {serviceCards.map((card) => (
        <a
          key={card.title}
          href={card.href}
          className="group flex min-h-[330px] flex-col rounded-[2rem] border border-[#F0DED8] bg-white p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#FFB9C1] hover:shadow-xl hover:shadow-rose-100/60"
        >
          <div className="flex items-start justify-between gap-5">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.4rem] text-[27px] ${card.color}`}
            >
              {card.symbol}
            </div>

            <span className="rounded-full bg-[#FFF8F3] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E64B60]">
              Guide Lia
            </span>
          </div>

          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            {card.eyebrow}
          </p>

          <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-[#10213D]">
            {card.title}
          </h3>

          <p className="mt-4 text-sm leading-7 text-slate-600">
            {card.text}
          </p>

          <div className="mt-auto flex items-center justify-between pt-8">
            <span className="text-sm font-semibold text-[#E64B60]">
              Être guidé
            </span>

            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF0EF] text-lg text-[#E64B60] transition duration-300 group-hover:translate-x-1 group-hover:bg-[#FF5F72] group-hover:text-white">
              →
            </span>
          </div>
        </a>
      ))}
    </div>
  </div>
</section>

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">Découvrir les options</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-[#163168] sm:text-4xl">
                Exemples de solutions dans le canton de Vaud
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Chaque situation est différente. Voici quelques types de solutions que les familles explorent souvent avec Lia.
              </p>
            </div>
            <a
  href="#form"
  className="inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-9 py-5 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:bg-[#E64B60]"
>
  Faire une demande <ArrowRight />
</a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {providerFilters.map((filter) => (
              <button key={filter} type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:bg-[#FFF0EF] hover:text-emerald-800">
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
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#E64B60]">
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
<section id="form" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
  <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
    <div>
      <h2 className="font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
        Chaque situation est unique.
      </h2>
      <div className="mt-2 h-2 w-56 rounded-full bg-[#FF7A87]" />

      <p className="mt-8 max-w-xl text-lg leading-8 text-[#10213D]">
        Que vous cherchiez un EMS, un appartement adapté, une aide à domicile ou simplement des conseils, Lia est là pour vous aider à y voir plus clair.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        {["Sans engagement", "Réponse rapide", "Service gratuit"].map((item) => (
          <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#10213D] shadow-sm ring-1 ring-[#F1DDD7]">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5F72] text-xs text-white">✓</span>
            {item}
          </span>
        ))}
      </div>

      <div className="mt-10 max-w-lg rounded-[2rem] bg-[#FFE1DE] p-8 text-[#10213D]">
        <div className="text-5xl leading-none text-[#FF5F72]">“</div>
        <p className="mt-2 text-base leading-8">
          Lia nous a vraiment aidés à y voir plus clair à un moment où on avait tellement besoin.
        </p>
        <p className="mt-5 text-sm font-semibold">— Famille, Lausanne</p>
        <div className="mt-4 text-right text-2xl text-[#FF5F72]">♡</div>
      </div>
    </div>

    <HeroForm />
  </div>
</section>
        

        <section id="guide" className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#E64B60]">Comprendre les options</p>
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
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1f7f3] text-2xl font-semibold text-[#E64B60]">
                  {card.symbol}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#153168]">{card.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{card.text}</p>
                <div className="mt-5 text-sm font-semibold text-[#E64B60]">Lire le guide →</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-8 pt-14 lg:px-8">
  <div className="relative overflow-hidden rounded-[2.5rem] border border-[#F2DAD4] bg-[#FFF0EF] px-7 py-10 sm:px-10 lg:px-14 lg:py-14">
    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#FFD8D4]/60 blur-3xl" />
    <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-white/70 blur-3xl" />

    <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E64B60] ring-1 ring-[#F1DDD7]">
          <HeartHandshake size={17} strokeWidth={1.8} />
          Lia se construit avec vous
        </div>

        <h2 className="mt-6 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
          Chaque famille mérite d’être accompagnée.
        </h2>

        <p className="mt-5 max-w-2xl text-base leading-8 text-slate-700">
          Lia accompagne ses premières familles dans le canton de Vaud afin
          de construire un service réellement utile, humain et adapté aux
          situations vécues.
        </p>

        <a
          href="#form"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-[#E64B60]"
        >
          Faire une demande
          <ArrowRight />
        </a>
      </div>

      <div className="rounded-[2rem] bg-white/85 p-7 shadow-lg shadow-rose-100/50 ring-1 ring-white backdrop-blur">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-[#E64B60]">
          <HeartHandshake size={27} strokeWidth={1.7} />
        </div>

        <h3 className="mt-5 text-xl font-semibold text-[#10213D]">
          Un accompagnement humain
        </h3>

        <p className="mt-3 text-sm leading-7 text-slate-600">
          Nous prenons le temps de comprendre votre situation avant de vous
          aider à clarifier les prochaines étapes.
        </p>

        <div className="mt-6 border-t border-[#F1DDD7] pt-5">
          <p className="text-xs leading-6 text-slate-500">
            <strong className="text-[#10213D]">Important :</strong> Lia n’est
            pas un prestataire médical, ne garantit pas de place en EMS et ne
            remplace pas l’avis d’un professionnel de santé.
          </p>
        </div>
      </div>
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

        <footer
  id="contact"
  className="mt-16 border-t border-[#F1DDD7] bg-[#FFF8F3]"
>
  <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
    <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#E64B60]">
          Besoin d’y voir plus clair ?
        </p>

        <h2 className="mt-4 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[#10213D] sm:text-5xl">
          Vous n’avez pas à avancer seul.
        </h2>

        <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
          Expliquez-nous la situation de votre proche. Lia vous aide à
          comprendre les options possibles et à identifier les prochaines
          étapes.
        </p>

        <a
          href="#form"
          className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#FF5F72] px-8 py-4 text-base font-bold text-white shadow-xl shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-[#E64B60]"
        >
          Faire une demande
          <ArrowRight />
        </a>
      </div>

      <div className="rounded-[2rem] border border-[#F1DDD7] bg-white p-7 shadow-lg shadow-rose-100/40 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFE1DE] text-[#E64B60]">
            <HeartHandshake size={27} strokeWidth={1.7} />
          </div>

          <div>
            <p className="text-sm text-slate-500">Une question ?</p>
            <h3 className="text-xl font-semibold text-[#10213D]">
              Contactez Lia
            </h3>
          </div>
        </div>

        <div className="mt-7 space-y-4">
          <a
            href="tel:+41795350781"
            className="flex items-center gap-4 rounded-2xl bg-[#FFF8F3] p-4 transition hover:bg-[#FFF0EF]"
          >
            <PhoneCall
              size={21}
              strokeWidth={1.8}
              className="text-[#E64B60]"
            />

            <div>
              <p className="text-xs text-slate-500">Téléphone</p>
              <p className="font-semibold text-[#10213D]">079 535 07 81</p>
            </div>
          </a>

          <a
            href="mailto:info@prochesuisse-vaud.ch"
            className="flex items-center gap-4 rounded-2xl bg-[#FFF8F3] p-4 transition hover:bg-[#FFF0EF]"
          >
            <MailIcon
              size={21}
              strokeWidth={1.8}
              className="text-[#E64B60]"
            />

            <div>
              <p className="text-xs text-slate-500">E-mail</p>
              <p className="font-semibold text-[#10213D]">
                info@prochesuisse-vaud.ch
              </p>
            </div>
          </a>

          <div className="flex items-center gap-4 rounded-2xl bg-[#FFF8F3] p-4">
            <MapPin
              size={21}
              strokeWidth={1.8}
              className="text-[#E64B60]"
            />

            <div>
              <p className="text-xs text-slate-500">Région</p>
              <p className="font-semibold text-[#10213D]">
                Lausanne, canton de Vaud
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="my-14 border-t border-[#EAD8D2]" />

    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr]">
      <div>
        <Logo />

        <p className="mt-5 max-w-sm text-sm leading-7 text-slate-600">
          Une orientation humaine et indépendante pour aider les familles à
          trouver un accompagnement adapté à un proche âgé.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-[#F1DDD7]">
          <ShieldCheck
            size={16}
            strokeWidth={1.8}
            className="text-[#E64B60]"
          />
          Données confidentielles
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-[#10213D]">Découvrir</h3>

        <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600">
          <a href="#how" className="transition hover:text-[#E64B60]">
            Comment ça marche
          </a>

          <a href="#services" className="transition hover:text-[#E64B60]">
            Solutions
          </a>

          <a href="#form" className="transition hover:text-[#E64B60]">
            Faire une demande
          </a>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-[#10213D]">Ressources</h3>

        <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600">
          <a href="#guide" className="transition hover:text-[#E64B60]">
            Guide des solutions
          </a>

          <a href="#guide" className="transition hover:text-[#E64B60]">
            Financement
          </a>

          <a href="#guide" className="transition hover:text-[#E64B60]">
            Alzheimer et démence
          </a>

          <a href="#guide" className="transition hover:text-[#E64B60]">
            Court séjour et répit
          </a>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-[#10213D]">À propos</h3>

        <div className="mt-5 flex flex-col gap-3 text-sm text-slate-600">
          <span>Notre mission</span>
          <span>Notre indépendance</span>
          <span>Questions fréquentes</span>
          <span>Mentions légales</span>
        </div>
      </div>
    </div>
  </div>

  <div className="border-t border-[#EAD8D2] bg-white/60">
    <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <p>© 2026 Lia — Tous droits réservés.</p>

      <p>
        Lia n’est pas un prestataire médical et ne remplace pas l’avis d’un
        professionnel de santé.
      </p>
    </div>
  </div>
</footer>
      </main>
    </div>
  );
}
