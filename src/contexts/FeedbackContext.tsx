import { PropsWithChildren, createContext, useCallback, useContext, useMemo, useState } from "react";
import { Portal } from "react-native-paper";
import { AppSnackbar, FeedbackType } from "../components/AppSnackbar";

type FeedbackMessage = {
  text: string;
  type: FeedbackType;
  duration: number;
};

type ShowMessageInput = {
  text: string;
  type?: FeedbackType;
  duration?: number;
};

type FeedbackContextValue = {
  showMessage: (message: ShowMessageInput) => void;
};

const DEFAULT_DURATION = 2600;

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export const FeedbackProvider = ({ children }: PropsWithChildren) => {
  const [message, setMessage] = useState<FeedbackMessage>({
    text: "",
    type: "info",
    duration: DEFAULT_DURATION,
  });
  const [visible, setVisible] = useState(false);

  const hideMessage = useCallback(() => {
    setVisible(false);
  }, []);

  const showMessage = useCallback((nextMessage: ShowMessageInput) => {
    setMessage({
      text: nextMessage.text,
      type: nextMessage.type ?? "info",
      duration: nextMessage.duration ?? DEFAULT_DURATION,
    });
    setVisible(true);
  }, []);

  const value = useMemo(
    () => ({
      showMessage,
    }),
    [showMessage]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Portal>
        <AppSnackbar
          visible={visible}
          type={message.type}
          text={message.text}
          duration={message.duration}
          onDismiss={hideMessage}
        />
      </Portal>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);

  if (!context) {
    throw new Error("useFeedback must be used within FeedbackProvider");
  }

  return context;
};

