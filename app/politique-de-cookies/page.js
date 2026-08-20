import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Politique de cookies | Lia",
  description: "Politique de cookies de Lia.",
};

export default function CookiesPage() {
  return (
    <InfoPage
      eyebrow="Informations"
      title="Politique de cookies"
      description="Informations sur l’usage des cookies et technologies similaires sur Lia."
      sections={[
        {
          id: "usage",
          title: "Utilisation des cookies",
          paragraphs: [
            "Lia peut utiliser des cookies strictement nécessaires au fonctionnement du site et à la sécurité des services.",
          ],
        },
        {
          id: "contact",
          title: "Contact",
          paragraphs: [
            "Pour toute question concernant les cookies, vous pouvez écrire à contact@liavaud.ch.",
          ],
        },
      ]}
    />
  );
}
