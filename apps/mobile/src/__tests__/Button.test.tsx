import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "../components/Button";

describe("Button", () => {
  it("appelle onPress quand on appuie dessus", () => {
    const onPress = jest.fn();
    render(<Button label="Valider" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("n'appelle pas onPress quand désactivé", () => {
    const onPress = jest.fn();
    render(<Button label="Valider" onPress={onPress} disabled testID="btn" />);
    fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("n'appelle pas onPress pendant le chargement", () => {
    const onPress = jest.fn();
    render(<Button label="Valider" onPress={onPress} loading testID="btn" />);
    fireEvent.press(screen.getByTestId("btn"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
