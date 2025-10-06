"use client";
import { use, useEffect, useState } from "react";
import { contexts, db, models} from "../ceramic/orbisDB";
import { OrbisConnectResult } from "@useorbis/db-sdk";
import { tr } from "framer-motion/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as jsonModelsRaw from "../ceramic/models.json";
const jsonModels: Record<string, any> = jsonModelsRaw;
import { getMe } from "../ceramic/userService";
import { retrieveMessages } from "../ceramic/messageService";


const SamplePage = () => {
    const [result, setResult] = useState<string>("");
    const orbis = db;

    useEffect(() => {
        const checkConnection = async () => {
            const connected: boolean = await orbis.isUserConnected();
            console.log("User connected:", connected);
        };

        checkConnection();
    }, []);

    const createModel = async () => {
        try {
            const model:any = jsonModels.whispy_user;
            const response = await orbis.ceramic.createModel(model);
            console.log("Modelo creado:", response);
        } catch (error) {
            console.error("Error creando el modelo:", error);
            setResult("Error creando el modelo");
        }
    };

    // const handleRequestTest = async () => {
        

    //         // Object.entries(models).forEach(([key, model]) => {
    //         //     try {

    //         //         console.log("Clave:", key);
    //         //         console.log("Modelo:", model);

    //         //         console.log("Intentando crear modelo...");
    //         //         const m : any = model;
    //         //         orbis.ceramic.createModel(m)
    //         //     } catch (error) {
    //         //         console.error("Error al crear el modelo:", error);
    //         //     }
    //         // });

            
    //     const model:any = models.chat_membership;
    //     orbis.ceramic.createModel(model);
            
                
   
        
    //     console.log("Data inserted successfully");
    
    // };

    const testData = async () => {
        try {
            const response = await orbis.insert("kjzl6hvfrbw6c5knx9o8v9nsvosx754tk445qw0fkmrord48xariyo37374w42c")
            .value(
                {
                    username: "testuser",
                    bio: "This is a test user",
                    isPrivate: false
                }
            )
            .context("kjzl6kcym7w8y4wk8z1hlf0rxomnejtoe1ybij5f9ohgpiwx0z2ta5wu8h5z0t6")
            .run();

            console.log("Data inserted successfully:", response);
        } catch (error) {
            console.error("Error inserting data:", error);
            setResult("Error inserting data");
        }

    };

    const showData = async () => {
        const { columns, rows } = await orbis
        .select()
        .from("kjzl6hvfrbw6c5knx9o8v9nsvosx754tk445qw0fkmrord48xariyo37374w42c")
        .context(contexts.whispy_test)
        .run()

        // SELECT * FROM table WHERE column_name = 'value';
        console.log("Retrieved data", rows)

    };

    const createTestChat = async () => {
        

        

        try {
            const userId = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!)["stream_id"] : null;

            const chatData = {
                title: "Test Chat 3",
                creator: userId,
                creationDate: new Date().toISOString()
            };

            const response = await orbis.insert(models.chat)
                .value(chatData)
                .context(contexts.whispy_test)
                .run();
            console.log("Chat created successfully:", response);

            const chat_membershipData = {
                chatId: response.id,
                userId: userId
            };

            const response2 = await orbis.insert(models.chat_membership)
                .value(chat_membershipData)
                .context(contexts.whispy_test)
                .run();
            console.log("Chat membership created successfully:", response2);

        } catch (error) {
            console.error("Error creating chat:", error);
        }
    };

    const sendMessage = async () => {
        const messageData = {
            date: new Date().toISOString(),
            author: "k2t6wzhkhabz4vige350c1pst8rofo13whlkyxbb54pob6l3y00uijrh83v54w",
            content: "Hello, this is a test message! No debe salir en el otro chat",
            chatId: "kjzl6kcym7w8y7m85horw933u8rt9vu09ncmuztagzwmwqbhm2oq8dmnr0fhtmr",
            msgType: "text"
        };

        try {
            const response = await orbis.insert(models.message)
                .value(messageData)
                .context(contexts.whispy_test)
                .run();
            console.log("Message sent successfully:", response);
        } catch (error) {
            console.error("Error sending message:", error);
        }
    }

    // const retrieveMessages = async () => {
    //     const { columns, rows } = await orbis
    //         .select()
    //         .from(models.message)
    //         .where(
    //             {
    //                 chatId: "kjzl6kcym7w8y8rs9islsickyk31iolkznk8zf2e5pgj6svd4nw0ihzr3r60p0e"
    //             }
    //         )
    //         .context(contexts.whispy_test)
    //         .run();
    //     console.log("Retrieved messages:", rows);
    // };
    
    const retrieveMyChats = async () => {
        const userId = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!)["stream_id"] : null;

        const chatModel = models.chat;
        const chatMembershipModel = models.chat_membership;
        const { columns, rows } = await orbis
        .select()
        .context(contexts.whispy_test)
        .raw(
            `
            SELECT c.*
            FROM "${chatModel}" AS c
            JOIN "${chatMembershipModel}" AS cm
                ON cm."chatId"   = c.stream_id
            WHERE cm."userId" = $1;

            `,
            [userId]
        )
        .run();

        console.log("Chats para test_user:", rows);

    };

    const connectedUser = async () => {
        const orbisSession = await db.getConnectedUser()
        if (!orbisSession) throw new Error("No hay sesión de usuario activa")
        const myDid = orbisSession.user.did
        console.log("Estoy conectado como DID:", myDid)

    }

    const handleGetMe = async () => {
        try {
            const profile = await getMe();
            console.log("Perfil de usuario:", profile);
            setResult(JSON.stringify(profile, null, 2));
        } catch (error: any) {
            console.error("Error al obtener el perfil:", error);
            setResult("Error al obtener el perfil");
        }
    };

    // const handleGetMessages = async () => {
    //     try {
    //         const messages = await retrieveMessages("kjzl6kcym7w8y8rs9islsickyk31iolkznk8zf2e5pgj6svd4nw0ihzr3r60p0e");
    //         console.log("Mensajes:", messages);
    //         setResult(JSON.stringify(messages, null, 2));
    //     } catch (error) {
    //         console.error("Error al obtener los mensajes:", error);
    //         setResult("Error al obtener los mensajes");
    //     }
    // };


    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-2xl font-bold mb-4">Componente de Prueba</h1>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={createModel}
            >
                Crear modelo: {JSON.stringify(jsonModels.whispy_user.name)}
            </button>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={testData}
            >
                Inserción de datos de prueba
            </button>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={showData}
            >
                Obtencion de prueba
            </button>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={createTestChat}
            >
                Crear chat de prueba
            </button>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={sendMessage}
            >
                Enviar mensaje de prueba
            </button>
            {/* <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={handleGetMessages}
            >
                Obtener mensajes de prueba
            </button> */}
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={retrieveMyChats}
            >
                Obtener mis chats
            </button>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={connectedUser}
            >
                Obtener mi DID
            </button>
            <button 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded mb-4" 
                onClick={handleGetMe}
            >
                Obtener mi perfil
            </button>
            
            {result && (
                <div className="bg-white p-4 rounded shadow-md">
                    <p>{result}</p>
                </div>
            )}
        </div>
    );
};

export default SamplePage;