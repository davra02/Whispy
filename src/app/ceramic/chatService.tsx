import { contexts, db, models } from "./orbisDB";
import { getMe } from "./userService";

export const retrieveMyChats = async () => {
    const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;

    const chatModel = models.chat;
    const chatMembershipModel = models.chat_membership;
    const userModel = models.user;

    const me = await getMe();
    const leftChats: string[] = me?.leftChats || [];

    const { columns, rows } = await db
    .select()
    .context(contexts.whispy_test)
    .raw(
        `
        SELECT c.*
        FROM "${chatModel}" AS c
        JOIN "${chatMembershipModel}" AS cm
            ON cm."chatId"   = c.stream_id
        WHERE cm."userId" = $1
        AND c.stream_id != ALL($2);

        `,
        [userId, leftChats]
    )
    .run();

    console.log("Chats para :", rows);
    return rows;

};

export const leaveChat = async (chatId: string) => {
    try {
        const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
        console.log("User ID:", userId);
        await db.getConnectedUser();
        
        const user = await db
            .select()
            .context(contexts.whispy_test)
            .from(models.user)
            .where({ stream_id: userId })
            .run();

        if (user.rows.length === 0) {
            throw new Error("User not found");
        }

        const currentLeftChats = user.rows[0].leftChats || [];
        if (!currentLeftChats.includes(chatId)) {
            currentLeftChats.push(chatId);
        }

        const updatedUser = await db.update(userId)
            .set({ leftChats: currentLeftChats })
            .run();
            
        console.log("Updated user after leaving chat:", updatedUser);
    } catch (error) {
        console.error("Error leaving chat:", error);
    }    
}

export const createChat = async (chatName: string, members: string[]) => {
   
    try {
        const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
        console.log("User ID:", userId);
        await db.getConnectedUser();

        members.push(userId); // Agregar el creador del chat a la lista de miembros

        const chatData = {
            title: chatName,
            creator: userId,
            admins: [userId],
            creationDate: new Date().toISOString()
        };

        const insertedChat = await db.insert(models.chat)
            .value(chatData)
            .context(contexts.whispy_test)
            .run();
        console.log("Chat created successfully:", insertedChat);

        for (const member of members) {

            const chat_membershipData = {
                chatId: insertedChat.id,
                userId: member
            };

            const insertedMembership = await db.insert(models.chat_membership)
                .value(chat_membershipData)
                .context(contexts.whispy_test)
                .run();
            console.log("Chat membership created successfully:", insertedMembership);
        }
        console.log("All memberships created successfully");

    } catch (error) {
        console.error("Error creating chat:", error);
    }    
}

export const getChatMembers = async (chatStreamId: string) => {
    const chatMembershipModel = models.chat_membership;
    const userModel = models.user;

    const { columns, rows } = await db
        .select()
        .context(contexts.whispy_test)
        .raw(
            `
            SELECT u.username, cm."userId"
            FROM "${chatMembershipModel}" AS cm
            JOIN "${userModel}" AS u
                ON u.stream_id = cm."userId"
            WHERE cm."chatId" = $1;
            `,
            [chatStreamId]
        )
        .run();

    console.log("Chat members:", rows);
    return rows;
}

export const getChatMembersComplete = async (chatStreamId: string) => {
    const chatMembershipModel = models.chat_membership;
    const userModel = models.user;

    const { columns, rows } = await db
        .select()
        .context(contexts.whispy_test)
        .raw(
            `
            SELECT u.*, cm."userId"
            FROM "${chatMembershipModel}" AS cm
            JOIN "${userModel}" AS u
                ON u.stream_id = cm."userId"
            WHERE cm."chatId" = $1;
            `,
            [chatStreamId]
        )
        .run();

    console.log("Chat members with complete info:", rows);
    return rows;
}

