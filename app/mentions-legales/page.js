import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Mentions légales | Lia",
  description:
    "Mentions légales de Lia : éditeur, contact, nature du service, responsabilité, propriété intellectuelle et liens externes.",
};

export default function LegalNoticePage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Mentions légales"
      description="Informations générales relatives au site Lia et à son utilisation."
      sections={[
        {
          id: "editeur",
          title: "Éditeur du site",
          paragraphs: [
            "Le site Lia est actuellement édité par Lucas Ruscio, à titre personnel.",
            "Adresse postale : Chemin Près-les-Bois 13, 1066 Épalinges, Suisse.",
            "Contact : contact@liavaud.ch.",
          ],
        },
        {
          id: "objet",
          title: "Objet de Lia",
          paragraphs: [
            "Lia est un service d’orientation et d’information destiné aux familles qui recherchent des solutions d’accompagnement pour un proche âgé, actuellement dans le canton de Vaud.",
            "Le site permet notamment d’explorer des EMS, services d’aide à domicile et résidences seniors, de consulter des guides et de transmettre une demande d’orientation.",
          ],
        },
        {
          id: "informations",
          title: "Nature informative des données",
          paragraphs: [
            "Les informations publiées sur Lia sont indicatives. Les prestations, conditions, tarifs, disponibilités, caractéristiques et informations administratives doivent être confirmés auprès des organismes concernés lorsqu’ils peuvent évoluer.",
            "Lia ne garantit pas l’exhaustivité, l’actualité permanente ou l’absence d’erreur des informations affichées.",
          ],
        },
        {
          id: "limites",
          title: "Limites du service",
          paragraphs: [
            "Lia n’est pas un prestataire médical, un EMS, un service social ou une autorité publique.",
            "Les contenus du site ne remplacent pas l’avis d’un professionnel de santé, d’un service social, d’une autorité compétente ou d’un conseil juridique adapté à une situation particulière.",
          ],
        },
        {
          id: "propriete-intellectuelle",
          title: "Propriété intellectuelle",
          paragraphs: [
            "Les textes, éléments graphiques, interfaces, marques, logos et contenus publiés sur Lia sont protégés dans la mesure prévue par le droit applicable.",
            "Toute reproduction, réutilisation substantielle ou exploitation non autorisée des contenus du site peut nécessiter l’accord préalable de Lia ou des titulaires concernés.",
          ],
        },
        {
          id: "liens-externes",
          title: "Liens externes",
          paragraphs: [
            "Le site peut contenir des liens vers des sites tiers ou des sources externes. Lia ne contrôle pas ces sites et ne peut pas garantir leur disponibilité, leur exactitude ou leurs pratiques en matière de données personnelles.",
          ],
        },
        {
          id: "droit-applicable",
          title: "Droit applicable",
          paragraphs: [
            "Ces mentions légales sont rédigées dans une perspective suisse. Les détails de juridiction et de for compétent doivent être confirmés avant mise en production : [À compléter avant mise en production].",
          ],
        },
      ]}
    />
  );
}
