import InfoPage from "../components/InfoPage";

export const metadata = {
  title: "Contact | Lia",
  description: "Contacter Lia pour une question ou une demande d’orientation.",
};

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Contactez Lia"
      description="Pour toute question, vous pouvez écrire à Lia par e-mail."
      sections={[
        {
          id: "email",
          title: "E-mail",
          paragraphs: ["contact@liavaud.ch"],
        },
      ]}
    />
  );
}
