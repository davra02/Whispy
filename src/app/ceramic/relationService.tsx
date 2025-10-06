import { contexts, db, models } from "./orbisDB";

export const sendFriendRequest = async (userPeerStreamId: string) => {
    await db.getConnectedUser();
    const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
    const now = new Date();

    // Verificar si ya existe una relación de amistad
    

    const friendEvent = {
        requester: userId,
        userPeer: userPeerStreamId,
        type: "REQUEST",
        lastMod: now.toISOString()
    };

    const insertedFriendEvent = await db.insert(models.friend_event)
        .value(friendEvent)
        .context(contexts.whispy_test)
        .run();
    console.log("Friend request sent successfully:", insertedFriendEvent);
}

export const acceptFriendRequest = async (userPeerStreamId: string, eventPeerId: string) => {
    await db.getConnectedUser();
    const now = new Date();
    const me = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
    const friendEvent = {
        requester: me,
        userPeer: userPeerStreamId,
        eventPeer: eventPeerId,
        type: "ACCEPT",
        lastMod: now.toISOString()
    };

    const insertedFriendEvent = await db.insert(models.friend_event)
        .value(friendEvent)
        .context(contexts.whispy_test)
        .run();
    console.log("Friend request accepted successfully:", insertedFriendEvent);
}

export const rejectFriendRequest = async (userPeerStreamId: string, eventPeerId: string) => {
    await db.getConnectedUser();
    const now = new Date();
    const friendEvent = {
        userPeer: userPeerStreamId,
        eventPeer: eventPeerId,
        type: "REJECT",
        lastMod: now.toISOString()
    };

    const insertedFriendEvent = await db.insert(models.friend_event)
        .value(friendEvent)
        .context(contexts.whispy_test)
        .run();
    console.log("Friend request rejected successfully:", insertedFriendEvent);
}

export const retrieveFriendRequests = async (): Promise<
  { username: string; userStream: string; eventToRespond: string }[]
> => {
  // 1. Obtén tu stream_id de usuario
  const stored = localStorage.getItem("orbis:user")
  const userId = stored ? JSON.parse(stored).stream_id : null
  if (!userId) {
    console.warn("No hay usuario en localStorage")
    return []
  }

  const userModel = models.user
  const friendEventModel = models.friend_event

  const { rows } = await db
    .select()
    .context(contexts.whispy_test)
    .raw(
      `
      SELECT DISTINCT ON (r."requester")
        u."username",
        r."requester"   AS "userStream",
        r."stream_id"   AS "eventToRespond"
      FROM "${friendEventModel}" AS r
      JOIN "${userModel}" AS u
        ON u."stream_id" = r."requester"
      WHERE r."userPeer" = $1
        AND r."type" = 'REQUEST'
        -- No haya un REJECT más reciente
        AND NOT EXISTS (
          SELECT 1
          FROM "${friendEventModel}" AS rej
          WHERE rej."type" = 'REJECT'
            AND rej."eventPeer" = r."stream_id"
            AND rej."lastMod" > r."lastMod"
        )
        -- No esté bloqueado por MÍ
        AND NOT EXISTS (
          SELECT 1
          FROM "${friendEventModel}" AS b1
          WHERE b1."type" = 'BLOCK'
            AND b1."requester" = $1
            AND b1."userPeer" = r."requester"
        )
        -- No esté bloqueado por EL OTRO USUARIO
        AND NOT EXISTS (
          SELECT 1
          FROM "${friendEventModel}" AS b2
          WHERE b2."type" = 'BLOCK'
            AND b2."requester" = r."requester"
            AND b2."userPeer" = $1
        )
        -- Lógica de aceptación: Solo excluir si está aceptada Y no hay DELETE más reciente
        AND NOT EXISTS (
          SELECT 1
          FROM "${friendEventModel}" AS acc
          WHERE acc."type" = 'ACCEPT'
            AND acc."eventPeer" = r."stream_id"
            -- Y no existe un DELETE más reciente que la aceptación
            AND NOT EXISTS (
              SELECT 1
              FROM "${friendEventModel}" AS del
              WHERE del."type" = 'DELETE'
                AND del."lastMod" > acc."lastMod"
                AND (
                  -- DELETE por parte del solicitante
                  (del."requester" = r."requester" AND del."userPeer" = $1)
                  OR
                  -- DELETE por parte mía
                  (del."requester" = $1 AND del."userPeer" = r."requester")
                )
            )
        )
        -- No haya un DELETE más reciente que anule directamente la solicitud
        AND NOT EXISTS (
          SELECT 1
          FROM "${friendEventModel}" AS del
          WHERE del."type" = 'DELETE'
            AND del."lastMod" > r."lastMod"
            AND (
              -- DELETE por parte del solicitante (quien envió el REQUEST)
              (del."requester" = r."requester" AND del."userPeer" = $1)
              OR
              -- DELETE por parte mía (quien recibe el REQUEST)
              (del."requester" = $1 AND del."userPeer" = r."requester")
            )
        )
      ORDER BY r."requester", r."lastMod" DESC;
      `,
      [userId]
    )
    .run()

  console.log("Friend requests:", rows)

  return rows.map(row => ({
    username: row.username,
    userStream: row.userStream,
    eventToRespond: row.eventToRespond,
  }))
}



  
export const retrieveContacts = async () => {
    // 1. Obtén tu stream_id de usuario
    const stored = localStorage.getItem("orbis:user")
    const userId = stored ? JSON.parse(stored).stream_id : null
    if (!userId) {
      console.warn("No hay usuario en localStorage")
      return []
    }
  
    const userModel = models.user
    const friendEventModel = models.friend_event
  
    // 2. Consulta contactos: uno por usuario (excluyéndote a ti), con la aceptación más reciente
    const { rows } = await db
      .select()
      .context(contexts.whispy_test)
      .raw(
        `
        SELECT DISTINCT ON (u."stream_id") u.*
        FROM "${friendEventModel}" AS req
        JOIN "${friendEventModel}" AS acc
          ON acc."type"      = 'ACCEPT'
         AND acc."eventPeer" = req."stream_id"
        JOIN "${userModel}" AS u
          ON u."stream_id" = CASE
               WHEN req."requester" = $1 THEN req."userPeer"
               ELSE req."requester"
             END
        WHERE req."type" = 'REQUEST'
          AND (req."requester" = $1 OR req."userPeer" = $1)
          AND u."stream_id" <> $1
          -- Excluir si existe un DELETE más reciente que la aceptación
          AND NOT EXISTS (
            SELECT 1
            FROM "${friendEventModel}" AS del
            WHERE del."type" = 'DELETE'
              AND del."lastMod" > acc."lastMod"
              AND (
                -- DELETE por parte del usuario actual
                (del."requester" = $1 AND del."userPeer" = u."stream_id")
                OR
                -- DELETE por parte del otro usuario
                (del."requester" = u."stream_id" AND del."userPeer" = $1)
              )
          )
        ORDER BY u."stream_id", acc."lastMod" DESC;
        `,
        [userId]
      )
      .run()
  
    return rows
  }

export const isFriend = async (otherStreamId: string): Promise<boolean> => {
    // 1. Obtén tu stream_id de usuario
    const stored = localStorage.getItem("orbis:user")
    const myStreamId = stored ? JSON.parse(stored).stream_id : null
    if (!myStreamId) {
      console.warn("No hay usuario en localStorage")
      return false
    }
    const myContacts = await retrieveContacts()
    const isFriend = myContacts.some((contact) => contact.stream_id === otherStreamId)
    return isFriend;
  }
  
export const isFriendRequestSent = async (otherStreamId: string): Promise<boolean> => {
    // 1. Obtén tu stream_id de usuario
    const stored = localStorage.getItem("orbis:user")
    const myStreamId = stored ? JSON.parse(stored).stream_id : null
    if (!myStreamId) {
      console.warn("No hay usuario en localStorage")
      return false
    }

    const friendEventModel = models.friend_event

    const { rows } = await db
      .select()
      .context(contexts.whispy_test)
      .raw(
        `
        SELECT r."stream_id"
        FROM "${friendEventModel}" AS r
        WHERE r."requester" = $1
          AND r."userPeer" = $2
          AND r."type" = 'REQUEST'
          -- No ha sido aceptada
          AND NOT EXISTS (
            SELECT 1
            FROM "${friendEventModel}" AS acc
            WHERE acc."type" = 'ACCEPT'
              AND acc."eventPeer" = r."stream_id"
          )
          -- No ha sido rechazada después del request
          AND NOT EXISTS (
            SELECT 1
            FROM "${friendEventModel}" AS rej
            WHERE rej."type" = 'REJECT'
              AND rej."eventPeer" = r."stream_id"
              AND rej."lastMod" > r."lastMod"
          )
          -- No ha sido eliminada después del request
          AND NOT EXISTS (
            SELECT 1
            FROM "${friendEventModel}" AS del
            WHERE del."type" = 'DELETE'
              AND del."lastMod" > r."lastMod"
              AND (
                -- DELETE por parte del usuario actual
                (del."requester" = $1 AND del."userPeer" = $2)
                OR
                -- DELETE por parte del otro usuario
                (del."requester" = $2 AND del."userPeer" = $1)
              )
          )
        LIMIT 1;
        `,
        [myStreamId, otherStreamId]
      )
      .run()

    return rows.length > 0;
}

export const deleteContact = async (otherStreamId: string) => {
    await db.getConnectedUser();
    const me = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
    const now = new Date();
    const friendEvent = {
        requester: me,
        userPeer: otherStreamId,
        type: "DELETE",
        lastMod: now.toISOString()
    };

    const insertedFriendEvent = await db.insert(models.friend_event)
        .value(friendEvent)
        .context(contexts.whispy_test)
        .run();
    console.log("Contact deleted successfully:", insertedFriendEvent);
} 

export const checkFriendRequest = async (otherStreamId: string) => {
  return await isFriendRequestSent(otherStreamId) && !await isFriend(otherStreamId);
}

export const countFriendRequests = async (): Promise<number> => {
  const requests = await retrieveFriendRequests();
  return requests.length;
}