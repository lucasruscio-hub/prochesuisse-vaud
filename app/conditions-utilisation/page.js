import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Conditions d’utilisation | Lia",
  description:
    "Conditions d’utilisation de Lia : finalité du site, vérification des informations, limites du service et utilisation acceptable.",
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Conditions d’utilisation"
      description="Ces conditions expliquent le cadre général d’utilisation du site Lia."
      sections={[
        {
          id: "objet",
          title: "Objet du site",
          paragraphs: [
            "Lia est un site d’information et d’orientation destiné à aider les familles à mieux comprendre les solutions possibles pour un proche âgé, notamment les EMS, l’aide à domicile, les résidences seniors et certains sujets pratiques liés aux soins.",
            "Lia ne garantit pas qu’une solution proposée ou affichée conviendra à une situation particulière.",
          ],
        },
        {
          id: "verification",
          title: "Vérification auprès des organismes",
          paragraphs: [
            "Les utilisateurs doivent vérifier les informations importantes directement auprès des prestataires ou organismes concernés, notamment les disponibilités, tarifs, prestations, conditions d’admission, délais et modalités pratiques.",
            "Les informations affichées sur Lia peuvent provenir de sources publiques, d’informations disponibles en ligne ou d’informations communiquées par des prestataires.",
          ],
        },
        {
          id: "garanties",
          title: "Absence de garantie de disponibilité ou de placement",
          paragraphs: [
            "Lia ne garantit pas la disponibilité d’une place, l’admission dans un établissement, l’obtention d’une prestation, un tarif déterminé ou une mise en relation aboutissant à une solution.",
          ],
        },
        {
          id: "pas-un-conseil",
          title: "Pas de conseil médical, juridique ou social",
          paragraphs: [
            "Lia n’est pas un prestataire médical, un EMS, un service social ou une autorité publique.",
            "Les contenus du site ne constituent pas un avis médical, juridique, social ou administratif personnalisé. En cas de doute, les utilisateurs doivent consulter les professionnels ou autorités compétents.",
          ],
        },
        {
          id: "utilisation-acceptable",
          title: "Utilisation acceptable",
          paragraphs: [
            "Les utilisateurs s’engagent à ne pas utiliser le site de manière abusive, frauduleuse, illicite ou susceptible de perturber son fonctionnement.",
            "Les informations transmises via le formulaire doivent être fournies de bonne foi et uniquement lorsque l’utilisateur est légitime à demander une orientation concernant la situation décrite.",
          ],
        },
        {
          id: "propriete-intellectuelle",
          title: "Propriété intellectuelle",
          paragraphs: [
            "Les contenus, textes, interfaces et éléments visuels du site Lia sont protégés dans la mesure prévue par le droit applicable.",
            "Toute reproduction ou réutilisation non autorisée du contenu du site peut être interdite.",
          ],
        },
        {
          id: "services-externes",
          title: "Services externes et liens",
          paragraphs: [
            "Lia peut renvoyer vers des sites tiers ou s’appuyer sur des services techniques externes. Ces services peuvent avoir leurs propres conditions et politiques.",
            "Lia ne contrôle pas le contenu ou le fonctionnement des sites tiers accessibles par lien externe.",
          ],
        },
        {
          id: "evolutions",
          title: "Évolution et disponibilité du service",
          paragraphs: [
            "Lia peut faire évoluer le site, ses contenus, ses fonctionnalités ou ses modalités d’accès. Le service peut être interrompu temporairement pour des raisons techniques, de maintenance ou de sécurité.",
          ],
        },
        {
          id: "responsabilite",
          title: "Responsabilité",
          paragraphs: [
            "Lia s’efforce de fournir des informations utiles et prudentes, mais ne peut pas garantir que le site sera exempt d’erreurs ou adapté à toutes les situations.",
            "Aucune disposition de ces conditions ne vise à exclure ou limiter une responsabilité qui ne pourrait pas être exclue ou limitée selon le droit applicable.",
          ],
        },
        {
          id: "droit-suisse",
          title: "Droit suisse",
          paragraphs: [
            "Ces conditions sont rédigées dans une perspective suisse. Lia est actuellement exploitée à titre personnel par Lucas Ruscio, Chemin Près-les-Bois 13, 1066 Épalinges, Suisse. Les détails relatifs au for compétent doivent être confirmés avant la mise en production : [À compléter avant mise en production].",
          ],
        },
      ]}
    />
  );
}
