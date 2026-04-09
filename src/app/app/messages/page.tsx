import { MessagesClient } from "./MessagesClient";
import { mockConversations, mockMessages } from "@/data/mock";

export default function MessagesPage() {
  return <MessagesClient conversations={mockConversations} messagesByConv={mockMessages} />;
}
