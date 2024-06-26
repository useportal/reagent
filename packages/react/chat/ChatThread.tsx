import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import Markdown from "react-markdown";
import type { Chat } from "@reagentai/reagent/chat";

import { AgentNodeRenderer } from "./node.js";
import { ChatStore } from "./state.js";
import { useChatTheme } from "./theme.js";

const ChatThread = (props: { store: ChatStore }) => {
  const theme = useChatTheme();
  const messages = props.store((s) => s.messages);
  const sortedMessageIds = props.store((s) => s.sortedMessageIds);
  const sortedMessages = useMemo(() => {
    return sortedMessageIds.map((id) => messages[id]);
  }, [messages, sortedMessageIds]);

  let chatMessagesContainerRef = useRef<HTMLDivElement>(null);
  let chatMessagesRef = useRef<HTMLDivElement>(null);

  const sendNewMessage = {
    isIdle: false,
    isPending: false,
  };

  const [lastMessage, setLastMessage] = useState(null);
  const scrollToBottom = () => {
    if (chatMessagesRef.current && chatMessagesContainerRef.current) {
      const containerHeight = parseFloat(
        getComputedStyle(chatMessagesRef.current!).height
      );
      chatMessagesContainerRef.current!.scrollTo({
        top: containerHeight + 100_000,
        left: 0,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, []);

  return (
    <div
      ref={chatMessagesContainerRef}
      className={clsx("chat-thread overflow-y-auto", theme.thread)}
    >
      <div className="flex justify-center items-center">
        <div
          className={clsx(
            "chat-messages-container flex-1",
            theme.messagesContainer
          )}
        >
          {messages && (
            <div
              ref={chatMessagesRef}
              className={clsx("chat-messages", theme.messages)}
            >
              {sortedMessages.map((message, index) => {
                const isLastMessage = index == sortedMessages.length - 1;

                if (isLastMessage && lastMessage !== message) {
                  setLastMessage(message as any);
                  scrollToBottom();
                }
                return (
                  <ChatMessage
                    key={index}
                    message={message}
                    store={props.store}
                    showRole={
                      index == 0 ||
                      sortedMessages[index - 1].role != message.role
                    }
                    theme={theme}
                  />
                );
              })}
              {sendNewMessage.isPending && !sendNewMessage.isIdle && (
                <div>
                  <ChatMessage
                    // @ts-expect-error
                    message={sendNewMessage.input}
                    store={props.store}
                    showRole={false}
                    theme={theme}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatMessage = (props: {
  message: Pick<Chat.Message, "id" | "message" | "ui" | "role" | "node">;
  store: ChatStore;
  showRole: boolean;
  theme: ReturnType<typeof useChatTheme>;
}) => {
  const theme = props.theme;
  const markdownRef = useRef<HTMLDivElement>(null);
  const role = useMemo(() => {
    const id = props.message.role || "user";
    return {
      id,
      name: id == "ai" ? "AI" : id == "system" ? null : "User",
    };
  }, [props.message.role]);

  return (
    <div
      className={clsx(
        "chat-message-container group flex flex-row",
        theme.messageContainer,
        {
          "!mt-0": !props.showRole,
        }
      )}
      data-role={role.id}
    >
      <div
        className={clsx("role-container", role.id, theme.roleContainer)}
        data-role={role.id}
      >
        {props.showRole && role.name && (
          <div className={clsx("role select-none text-center", theme.role)}>
            {role.name}
          </div>
        )}
      </div>
      <div
        className={clsx("chat-message flex-1 overflow-x-hidden", theme.message)}
        data-message-id={props.message.id}
        data-role={role.id}
      >
        {props.message.ui && (
          <div className={clsx("chat-message-ui", theme.messageUI)}>
            <AgentNodeRenderer
              messageId={props.message.id}
              store={props.store}
              node={props.message.node}
              render={props.message.ui!}
            />
          </div>
        )}
        {
          // node isn't set for user message
          (Boolean(props.message.message) ||
            props.message.node?.type == "@core/chat-completion") && (
            <div
              ref={markdownRef}
              className={clsx(
                "chat-message-content prose select-text",
                theme.messageContent
              )}
              data-role={role.id}
            >
              <Markdown remarkPlugins={[]}>
                {props.message.message!.content}
              </Markdown>
            </div>
          )
        }
      </div>
    </div>
  );
};

export { ChatThread };
