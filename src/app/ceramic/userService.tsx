import { catchError } from "@useorbis/db-sdk/util";
import { encryptWithPassword, generateKeyPair } from "./criptoService";
import { contexts, db, models } from "./orbisDB"

const parseToDid = (address: string): string => {
    // Asegurarse de que la dirección empiece por "0x"
    const normalized = address.startsWith("0x") ? address : `0x${address}`;
    return `did:pkh:eip155:1:${normalized}`;
};




export const getMe = async (): Promise<any> => {
    const orbisSession = await db.getConnectedUser()
    if (!orbisSession) throw new Error("No hay sesión de usuario activa")
    const myDid = orbisSession.user.did
    try {
      debugger;
        console.log("El modelo del usuario es:", models.user);
        const result = await db
        .select()
        .from(models.user)
        .where({ controller: myDid })
        .context(contexts.whispy_test)
        .run()
    
        return result.rows[0]
    } catch (error) {
        console.error("Error al obtener el perfil:", error)
        throw new Error("Error al obtener el perfil")
    }
}

export const getUserByBcAdress = async (bc_adress: string): Promise<any> => {

    const orbisSession = await db.getConnectedUser()
    if (!orbisSession) throw new Error("No hay sesión de usuario activa")
    const did = parseToDid(bc_adress)
    try {
        const result = await db
        .select()
        .from(models.user)
        .where({ controller: did })
        .context(contexts.whispy_test)
        .run()
    
        return result.rows[0]
    } catch (error) {
        console.error("Error al obtener el perfil:", error)
        throw new Error("Error al obtener el perfil")
    }
}

export const getUserByUsername = async (username: string): Promise<any> => {
    const orbisSession = await db.getConnectedUser()
    if (!orbisSession) throw new Error("No hay sesión de usuario activa")
    try {
        const result = await db
        .select()
        .from(models.user)
        .where({ username: username })
        .context(contexts.whispy_test)
        .run()
    
        return result.rows[0]
    } catch (error) {
        console.error("Error al obtener el perfil:", error)
        throw new Error("Error al obtener el perfil")
    }
}

export const getUserById = async (userId: string): Promise<any> => {
    const orbisSession = await db.getConnectedUser()
    if (!orbisSession) throw new Error("No hay sesión de usuario activa")
    try {
        const result = await db
        .select()
        .from(models.user)
        .where({ stream_id: userId })
        .context(contexts.whispy_test)
        .run()
        console.log("Resultado de la consulta:", result)
        return result.rows[0]
    } catch (error) {
        console.error("Error al obtener el perfil:", error)
        throw new Error("Error al obtener el perfil")
    }
}

export const registerUser = async (userName: string, password: string): Promise<any> => {
    console.log("Registrando usuario en OrbisDB")
    await db.getConnectedUser();

    const { publicKey, privateKey } = await generateKeyPair();

    const encriptedPrivateKey = await encryptWithPassword(privateKey, password);
    localStorage.setItem("orbis:key", encriptedPrivateKey);

    const user = {
        username: userName,
        isPrivate: false,
        bio: "",
        publicKey: publicKey
    }

    try {

        const result = await db
        .insert(models.user)
        .value(user)
        .context(contexts.whispy_test)
        .run()

        console.log("Usuario registrado exitosamente:", result);

        const localuser = await getMe();
        localStorage.setItem("orbis:user", JSON.stringify(localuser));
    
        return privateKey;
    } catch (error) {
        console.error("Error al registrar el usuario:", error);
        throw new Error("Error al registrar el usuario");
    }

}

export const searchUsersByUsername = async (username: string) => {
    const userModel = models.user
    const { columns, rows } = await db
        .select()
        .context(contexts.whispy_test)
        .raw(
            `
            SELECT *
            FROM "${userModel}"
            WHERE username ILIKE $1;
            `,
            [`%${username}%`]
        )
        .run()

    return rows
}

export const changeProfilePicture = async (image: string): Promise<any> => {
  const orbisSession = await db.getConnectedUser();
  if (!orbisSession) throw new Error("No hay sesión de usuario activa");
  const stored = localStorage.getItem("orbis:user");
  const userId = stored ? JSON.parse(stored).stream_id : null;
  if (!userId) {
    console.warn("No hay usuario en localStorage");
    return [];
  }

  // 1. Obtén el contenido actual
  const currentResult = await db
    .select("username", "bio", "isPrivate", "publicKey", "profilePicture")
    .from(models.user)
    .where({ stream_id: userId })
    .run();

  const current = currentResult.rows?.[0] as any;
  if (!current) throw new Error("No se encontró el usuario");

  // 2. Crea el objeto limpio con únicamente los campos del esquema
  const clean = {
    username: current.username,
    isPrivate: current.isPrivate,
    publicKey: current.publicKey,
    bio: current.bio,
    profilePicture: image, // nuevo valor
  };

  try {
    // 3. Reemplaza todo el contenido del documento
    const result = await db
      .update(userId)
      .replace(clean) // reemplaza por clean, sin merges
      .run();

    localStorage.setItem("orbis:user", JSON.stringify(clean)); // Actualiza localStorage
    console.log("Imagen de perfil cambiada exitosamente:", result);

      return result;
  } catch (error) {
    console.error("Error al cambiar la imagen de perfil:", error);
    throw new Error("Error al cambiar la imagen de perfil");
  }
};


export const updateBio = async (bio: string): Promise<any> => {
  const orbisSession = await db.getConnectedUser();
  if (!orbisSession) throw new Error("No hay sesión de usuario activa");

  const stored = localStorage.getItem("orbis:user");
  const userId = stored ? JSON.parse(stored).stream_id : null;
  if (!userId) {
    console.warn("No hay usuario en localStorage");
    return [];
  }

  // 1. Obtener el contenido actual solo con campos válidos
  const currentResult = await db
    .select("username", "bio", "isPrivate", "publicKey", "profilePicture")
    .from(models.user)
    .where({ stream_id: userId })
    .run();
    

  const current = currentResult.rows?.[0] as any;
  if (!current) throw new Error("No se encontró el usuario");

  // 2. Construir objeto limpio conforme al esquema
  const clean = {
    username: current.username,
    isPrivate: current.isPrivate,
    publicKey: current.publicKey,
    profilePicture: current.profilePicture,
    bio: bio // aquí actualizamos la bio
  };

  try {
    // 3. Reemplazar totalmente el contenido del documento
    const result = await db
      .update(userId)
      .replace(clean)
      .run();

    localStorage.setItem("orbis:user", JSON.stringify(clean)); // Actualizar localStorage
    console.log("Biografía actualizada exitosamente:", result);

    return result;
  } catch (error) {
    console.error("Error al actualizar biografía:", error);
    throw new Error("Error al actualizar la biografía");
  }
};


