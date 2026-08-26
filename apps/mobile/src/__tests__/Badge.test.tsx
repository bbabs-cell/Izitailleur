import { render, screen } from "@testing-library/react-native";
import { Badge } from "../components/Badge";

describe("Badge", () => {
  it("affiche toujours un texte et une icône, jamais la couleur seule", () => {
    render(<Badge label="Urgent" tone="danger" />);
    expect(screen.getByText("Urgent")).toBeTruthy();
    expect(screen.getByText("\u{1F534}")).toBeTruthy();
  });

  it("accepte une icône personnalisée", () => {
    render(<Badge label="Livrée" tone="success" icon="📦" />);
    expect(screen.getByText("📦")).toBeTruthy();
  });
});
