import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Politique de cookies | Lia",
  description:
    "Politique de cookies de Lia : technologies actuellement utilisées et absence d’analytics ou de tracking publicitaire dans le code actuel.",
};

export default function CookiesPage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Politique de cookies"
      description="Cette page explique l’usage actuel des cookies et technologies similaires sur Lia."
      sections={[
        {
          id: "etat-actuel",
          title: "État actuel du site",
          paragraphs: [
            "L’inspection du dépôt ne montre pas d’outil d’analytics, de pixel publicitaire, de cookie publicitaire, d’intégration tierce de tracking, ni d’utilisation de localStorage ou sessionStorage dans le code applicatif.",
            "Le site ne met donc pas actuellement en avant de système de consentement aux cookies, car aucun outil d’analyse ou de suivi marketing n’est installé dans le code examiné.",
          ],
        },
        {
          id: "cookies-techniques",
          title: "Cookies strictement nécessaires",
          paragraphs: [
            "Certaines technologies strictement nécessaires peuvent être utilisées par l’infrastructure technique pour faire fonctionner, sécuriser ou délivrer le site. Les détails exacts liés à l’hébergement de production doivent être confirmés : [À compléter avant mise en production].",
          ],
        },
        {
          id: "formulaire",
          title: "Formulaire et stockage local",
          paragraphs: [
            "Le formulaire Lia fonctionne avec l’état React de la page et envoie la demande à l’API interne du site. Le code examiné ne montre pas de stockage des réponses du formulaire dans localStorage ou sessionStorage.",
          ],
        },
        {
          id: "evolutions",
          title: "Évolutions futures",
          paragraphs: [
            "Si Lia introduit ultérieurement des outils d’analytics, de mesure d’audience, de publicité, de personnalisation ou d’autres technologies de suivi, cette politique devra être mise à jour.",
            "Un mécanisme d’information ou de consentement devra être ajouté si les technologies utilisées l’exigent.",
          ],
        },
        {
          id: "contact",
          title: "Contact",
          paragraphs: [
            "Pour toute question concernant les cookies ou technologies similaires, vous pouvez écrire à contact@liavaud.ch.",
          ],
        },
      ]}
    />
  );
}
