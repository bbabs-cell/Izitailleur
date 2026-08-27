import { Modal, Pressable, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { Button } from "./Button";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { colors, radius, spacing, typography } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.lg }}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
        onPress={onCancel}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: spacing.lg,
            gap: spacing.sm,
          }}
        >
          <Text style={[typography.subtitle, { color: colors.textPrimary }]}>{title}</Text>
          {description ? (
            <Text style={[typography.body, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Button label={cancelLabel} variant="secondary" onPress={onCancel} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={onConfirm} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
