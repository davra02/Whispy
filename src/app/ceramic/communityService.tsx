import { col } from "framer-motion/client";
import { contexts, db, models } from "./orbisDB";
import { catchError } from "@useorbis/db-sdk/util";

async function ensureClockIsSane() {
  // Si tu server está en Node y el cliente en navegador, lo ideal es NTP en ambos.
  // Aquí simplemente dejamos el recordatorio; si quieres, puedes loguear Date.now()
  // y compararlo con un endpoint confiable.
}

function isCacaoExpiredError(e: any): boolean {
  const msg = (e?.message || e?.toString() || '').toLowerCase();
  return msg.includes('cacao expired') || msg.includes('capability expired');
}

async function renewDidSession(db: any, { expiresInSecs = 60 * 60 * 24 * 90 } = {}) {
  // Según SDK:
  // - Algunos exponen db.disconnect()/db.connect()
  // - En Orbis SDK antiguo: orbis.disconnect(); await orbis.connect()
  // - En did-session puro: regenerar sesión y asignar ceramic.did
  try {
    // Limpia posibles sesiones guardadas para forzar re-firma
    localStorage.removeItem('orbis:session');
    localStorage.removeItem('did-session');

    if (typeof db.disconnect === 'function') {
      await db.disconnect();
    }
    if (typeof db.connect === 'function') {
      await db.connect({ expiresInSecs }); // si tu SDK no acepta expiresInSecs, omítelo
    } else if (typeof db.getConnectedUser === 'function') {
      // Algunos SDKs renuevan al llamar a getConnectedUser() si no hay sesión
      await db.getConnectedUser();
    }
  } catch (e) {
    console.error('Error renewing DID session:', e);
    throw e;
  }
}

async function restoreStreamIfPossible(db: any, streamId: string) {
  // Si puedes acceder al cliente Ceramic subyacente:
  //   - a veces está en db.ceramic, db.runtime.ceramic o db._ceramic
  const ceramic =
    (db as any)?.ceramic ||
    (db as any)?.runtime?.ceramic ||
    (db as any)?._ceramic ||
    null;

  if (ceramic && typeof ceramic.loadStream === 'function') {
    try {
      // Forzar sync para descartar commits inválidos posteriores al vencimiento
      await ceramic.loadStream(streamId, { sync: 'always' });
    } catch (e) {
      console.warn('Could not force-sync stream, will proceed anyway:', e);
    }
  }
}

export const retrieveMyCommunities = async () => {
    const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;

    const communityModel = models.community;
    const communityMembershipModel = models.community_membership;
    const { columns, rows } = await db
    .select()
    .context(contexts.whispy_test)
    .raw(
        `
        SELECT c.*
        FROM "${communityModel}" AS c
        JOIN "${communityMembershipModel}" AS cm
            ON cm."communityId"   = c.stream_id
        WHERE cm."userId" = $1 AND cm.active = true;

        `,
        [userId]
    )
    .run();

    console.log("Community para test_user:", rows);
    return rows;

};


export const joinCommunity = async (communityId: string) => {
    try {
        const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
        console.log("User ID:", userId);
        await db.getConnectedUser();

        const community_membershipData = {
            communityId: communityId,
            userId: userId,
            active: true
        };

        const existingCM = await db
            .select()
            .context(contexts.whispy_test)
            .from(models.community_membership)
            .where(
                {
                    communityId: communityId,
                    userId: userId
                }
            )
            .run();

        if (existingCM.rows.length > 0) {
            const cm = existingCM.rows[0]
            const updatedMembership = await db.update(cm.stream_id)
                .set({ active: true })
                .run();
            console.log("Community membership updated successfully:", updatedMembership);
        } else {
            const insertedMembership = await db.insert(models.community_membership)
                .value(community_membershipData)
                .context(contexts.whispy_test)
                .run();
            console.log("Community membership created successfully:", insertedMembership);
        }

    } catch (error) {
        console.error("Error creating community membership:", error);
    }
}

export const leaveCommunity = async (communityId: string) => {
  try {
    await ensureClockIsSane();

    const userObjStr = localStorage.getItem('orbis:user');
    const userId = userObjStr ? JSON.parse(userObjStr)['stream_id'] : null;
    if (!userId) {
      console.error('No userId in localStorage. User not connected.');
      await renewDidSession(db);        // intenta reconectar
    }

    // Asegura que hay sesión activa (no garantiza que no esté expirada, pero fuerza login)
    await db.getConnectedUser();

    const existingCM = await db
      .select()
      .context(contexts.whispy_test)
      .from(models.community_membership)
      .where({ communityId, userId })
      .run();

    if (existingCM.rows.length === 0) {
      console.log('No community membership found; nothing to deactivate.');
      return;
    }

    const cm = existingCM.rows[0];

    // 1º: intenta actualizar
    try {
      const updatedMembership = await db
        .update(cm.stream_id)
        .set({ active: false })
        .run();

      console.log('Community membership updated successfully:', updatedMembership);
      return;
    } catch (e1) {
      // Si la sesión estaba vencida o el stream tiene commits inválidos, reparamos y reintentamos una sola vez
      if (isCacaoExpiredError(e1)) {
        console.warn('CACAO expired detected. Renewing session and forcing stream restore...');
        await renewDidSession(db);
        await restoreStreamIfPossible(db, cm.stream_id);

        const updatedMembership = await db
          .update(cm.stream_id)
          .set({ active: false })
          .run();

        console.log('[Retry] Community membership updated successfully:', updatedMembership);
        return;
      }

      // Otros errores: repropaga con contexto
      console.error('Error updating membership (non-CACAO cause):', e1);
      throw e1;
    }
  } catch (error) {
    console.error('Error updating community membership:', error);
  }
};

export const createCommunity = async (communityName: string, description: string) => {
    try {
        const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
        console.log("User ID:", userId);
        await db.getConnectedUser();

        const communityData = {
            name: communityName,
            description: description,
            creator: userId,
            admins: [userId]
        };

        const insertedCommunity = await db.insert(models.community)
            .value(communityData)
            .context(contexts.whispy_test)
            .run();
        console.log("Community created successfully:", insertedCommunity);

        const community_membershipData = {
            communityId: insertedCommunity.id,
            userId: userId,
            active: true
        };
        const insertedMembership = await db.insert(models.community_membership)
            .value(community_membershipData)
            .context(contexts.whispy_test)
            .run();
        console.log("Community membership created successfully:", insertedMembership);

    } catch (error) {
        console.error("Error creating community:", error);
    }
}

export const searchCommunities = async (searchTerm: string) => {
    const pattern = `%${searchTerm}%`;
    const { columns, rows } = await db
      .select()
      .context(contexts.whispy_test)
      .raw(
        `
        SELECT *
        FROM "${models.community}"
        WHERE name ILIKE $1
          OR description ILIKE $1;
        `,
        [pattern]
      )
      .run();

    return rows;
}

export const getCommunityById = async (communityId: string) => {
    const { columns, rows } = await db
        .select()
        .context(contexts.whispy_test)
        .from(models.community)
        .where(
            {
                stream_id: communityId
            }
        )
        .run();
    console.log("Retrieved community:", rows);
    return rows[0];
}

export const checkJoined = async (communityId: string) => {
    const userId = localStorage.getItem("orbis:user") ? JSON.parse(localStorage.getItem("orbis:user")!)["stream_id"] : null;
    console.log("User ID:", userId);
    await db.getConnectedUser();

    const existingCM = await db
        .select()
        .context(contexts.whispy_test)
        .from(models.community_membership)
        .where(
            {
                communityId: communityId,
                userId: userId
            }
        )
        .run();

    console.log("Existing community membership:", existingCM);

    if (!existingCM || !existingCM.rows || existingCM.rows.length === 0) {
        console.log("No membership found for this community.");
        return false;
    }

    return existingCM.rows ? existingCM.rows[0].active : false;
}