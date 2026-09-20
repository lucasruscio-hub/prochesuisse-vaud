import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Politique de confidentialité | Lia",
  description:
    "Politique de confidentialité de Lia : données collectées, finalités, destinataires, droits et sécurité.",
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Politique de confidentialité"
      description="Cette politique explique comment Lia traite les données transmises par les familles lorsqu’elles utilisent le site et le formulaire d’orientation."
      sections={[
        {
          id: "responsable",
          title: "Responsable du traitement",
          paragraphs: [
            "Le responsable du traitement pour le service Lia est Lucas Ruscio, qui exploite actuellement Lia à titre personnel.",
            "Adresse postale : Chemin Près-les-Bois 13, 1066 Épalinges, Suisse.",
            "Pour toute question relative aux données personnelles, vous pouvez écrire à contact@liavaud.ch.",
          ],
        },
        {
          id: "donnees-collectees",
          title: "Données collectées",
          paragraphs: [
            "Lorsque vous remplissez le formulaire Lia, le site collecte les informations que vous fournissez : type de besoin recherché, commune ou région, niveau d’urgence, description de la situation, besoins sélectionnés, âge approximatif de la personne concernée, question relative au financement et détails libres si vous choisissez d’en ajouter.",
            "Le formulaire collecte également vos coordonnées : prénom, nom, adresse e-mail et numéro de téléphone, ainsi que votre consentement au contact au sujet de votre demande.",
            "Certaines informations concernant la situation d’un proche, ses besoins d’aide, son autonomie, une hospitalisation, une chute, des troubles cognitifs ou d’autres besoins de soins peuvent constituer des données personnelles sensibles lorsque la personne concernée est identifiable.",
          ],
        },
        {
          id: "finalites",
          title: "Pourquoi Lia traite ces données",
          paragraphs: [
            "Lia traite ces données pour répondre à votre demande, comprendre la situation décrite, identifier des pistes de solutions de soins ou d’accompagnement, communiquer avec vous au sujet de votre demande, et exploiter ou sécuriser le service.",
            "Lia ne doit pas utiliser les informations du formulaire pour des finalités incompatibles avec votre demande sans information appropriée.",
          ],
        },
        {
          id: "principes",
          title: "Base et principes",
          paragraphs: [
            "Lia traite les données personnelles conformément aux principes applicables du droit suisse de la protection des données, notamment la transparence, la proportionnalité, la finalité et la sécurité.",
            "Les bases juridiques ou justifications précises du traitement doivent être confirmées selon le mode d’exploitation final de Lia : [À compléter avant mise en production].",
          ],
        },
        {
          id: "destinataires",
          title: "Destinataires",
          paragraphs: [
            "Les données transmises via le formulaire sont enregistrées dans Supabase, utilisé par Lia pour stocker les demandes reçues.",
            "Une notification contenant les informations principales de la demande est envoyée via Resend à l’adresse interne configurée pour recevoir les leads.",
            "Le code actuel ne montre pas d’envoi automatique des données de lead à des EMS, services d’aide à domicile, résidences seniors ou autres prestataires de soins.",
            "L’accès aux données doit être limité aux personnes et prestataires techniques qui en ont besoin pour traiter la demande ou exploiter le service.",
          ],
        },
        {
          id: "hebergement-transferts",
          title: "Hébergement et transferts à l’étranger",
          paragraphs: [
            "Le dépôt utilise Supabase pour l’enregistrement des leads et Resend pour l’envoi des notifications e-mail. Le dépôt ne permet pas d’établir avec certitude les régions d’hébergement, les lieux exacts de traitement ou les éventuels transferts à l’étranger.",
            "Les informations relatives à l’hébergement du site, aux régions Supabase, aux traitements Resend et à tout autre prestataire technique doivent être vérifiées avant la mise en production : [À compléter avant mise en production].",
          ],
        },
        {
          id: "conservation",
          title: "Durée de conservation",
          paragraphs: [
            // TODO interne : mettre en œuvre la suppression/anonymisation opérationnelle
            // avant que le volume de leads de production devienne significatif,
            // y compris les notifications e-mail et les copies associées.
            // Cette politique déclarée ne constitue pas un système de suppression automatique.
            "Les demandes et informations associées sont conservées pendant au maximum 12 mois après la dernière interaction utile avec la personne concernée, sauf si une conservation plus longue est nécessaire pour respecter une obligation légale, gérer un litige ou répondre à une demande de la personne concernée. À l’issue de cette période, les données doivent être supprimées ou anonymisées.",
          ],
        },
        {
          id: "droits",
          title: "Droits des personnes",
          paragraphs: [
            "Dans les conditions prévues par le droit suisse applicable, vous pouvez demander des informations sur les données personnelles traitées par Lia, demander leur correction ou demander leur suppression.",
            "Vous pouvez adresser ces demandes à contact@liavaud.ch. Lia pourra devoir vérifier votre identité avant de répondre à certaines demandes.",
          ],
        },
        {
          id: "securite",
          title: "Sécurité",
          paragraphs: [
            "Lia met en place des mesures techniques et organisationnelles appropriées pour protéger les données personnelles contre les accès non autorisés, la perte ou l’utilisation abusive.",
            "Aucune certification, norme de sécurité spécifique ou mécanisme de chiffrement particulier n’est documenté dans le dépôt ; ces éléments ne sont donc pas revendiqués ici.",
          ],
        },
        {
          id: "mise-a-jour",
          title: "Mise à jour de la politique",
          paragraphs: [
            "Cette politique pourra évoluer lorsque les services de Lia, ses prestataires techniques, son modèle ou ses processus seront précisés.",
          ],
        },
      ]}
    />
  );
}
