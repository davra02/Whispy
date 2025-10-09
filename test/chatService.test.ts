// test/chatService.test.ts

// 1. Mocks
const dbMock = {
  getConnectedUser: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  context: jest.fn().mockReturnThis(),
  run: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  value: jest.fn().mockReturnThis(),
  raw: jest.fn().mockReturnThis(),
};

const modelsMock = { 
  chat: 'ChatTable', 
  chat_membership: 'ChatMembershipTable', 
  user: 'UserTable'
};
const contextsMock = { whispy_test: 'testContext' };

// 2. Mock orbisDB
jest.mock('@/app/ceramic/orbisDB', () => ({
  db: dbMock,
  models: modelsMock,
  contexts: contextsMock,
}));

// 🔹 Mock userService.getMe:
jest.mock('@/app/ceramic/userService', () => ({
  getMe: jest.fn(),
}));

import { getMe } from '@/app/ceramic/userService';
import {
  retrieveMyChats,
  createChat,
  getChatMembers,
  getChatMembersComplete,
} from '@/app/ceramic/chatService';

// 4. Mock localStorage y console
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('chatService', () => {

  describe('retrieveMyChats', () => {
  it('devuelve la lista de chats para el usuario', async () => {
    // Mock de getMe para que no falle la sesión
    (getMe as jest.Mock).mockResolvedValue({ stream_id: 'user1', username: 'test' });

    (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify({ stream_id: 'user1' }));
    dbMock.select.mockReturnThis();
    dbMock.context.mockReturnThis();
    dbMock.raw.mockReturnThis();
    dbMock.run.mockResolvedValue({
      columns: [],
      rows: [
        { stream_id: 'chat1', title: 'Chat 1' },
        { stream_id: 'chat2', title: 'Chat 2' },
      ],
    });

    const result = await retrieveMyChats();
    expect(result).toEqual([
      { stream_id: 'chat1', title: 'Chat 1' },
      { stream_id: 'chat2', title: 'Chat 2' },
    ]);
  });
});

  describe('createChat', () => {
    it('crea un chat y añade miembros correctamente', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify({ stream_id: 'me' }));
      dbMock.getConnectedUser.mockResolvedValue({ user: { did: 'did:xyz' } });

      // Simula IDs que retorna la inserción del chat
      const insertedChat = { id: 'chatNew' };
      dbMock.insert.mockReturnThis();
      dbMock.value.mockReturnThis();
      dbMock.context.mockReturnThis();

      // Inserción del chat
      dbMock.run
        .mockResolvedValueOnce(insertedChat) // para el chat
        .mockResolvedValueOnce({})           // para el miembro 1
        .mockResolvedValueOnce({});          // para el miembro 2

      const members = ['u1', 'u2'];
      await createChat('Nuevo Chat', members);

      // El creador también debe estar en members
      expect(members).toContain('me');
      expect(dbMock.insert).toHaveBeenCalledWith('ChatTable');
      expect(dbMock.value).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Nuevo Chat',
        creator: 'me',
        admins: ['me'],
        creationDate: expect.any(String),
      }));
      // Se crea membresía para cada miembro
      expect(dbMock.insert).toHaveBeenCalledWith('ChatMembershipTable');
    });

    it('loggea error si ocurre una excepción', async () => {
      (window.localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify({ stream_id: 'me' }));
      dbMock.getConnectedUser.mockRejectedValue(new Error('No DB'));
      await createChat('Test Chat', ['a', 'b']);
      expect(console.error).toHaveBeenCalledWith("Error creating chat:", expect.any(Error));
    });
  });

  describe('getChatMembers', () => {
    it('devuelve la lista de miembros del chat', async () => {
      dbMock.select.mockReturnThis();
      dbMock.context.mockReturnThis();
      dbMock.raw.mockReturnThis();
      dbMock.run.mockResolvedValue({
        columns: [],
        rows: [
          { username: 'Ana', userId: 'u1' },
          { username: 'Luis', userId: 'u2' },
        ],
      });

      const result = await getChatMembers('chat123');
      expect(result).toEqual([
        { username: 'Ana', userId: 'u1' },
        { username: 'Luis', userId: 'u2' },
      ]);
    });
  });

  describe('getChatMembersComplete', () => {
    it('devuelve miembros del chat con info completa', async () => {
      dbMock.select.mockReturnThis();
      dbMock.context.mockReturnThis();
      dbMock.raw.mockReturnThis();
      dbMock.run.mockResolvedValue({
        columns: [],
        rows: [
          { username: 'Sofia', userId: 'u1', age: 30 },
          { username: 'Pedro', userId: 'u2', age: 27 },
        ],
      });

      const result = await getChatMembersComplete('chat321');
      expect(result).toEqual([
        { username: 'Sofia', userId: 'u1', age: 30 },
        { username: 'Pedro', userId: 'u2', age: 27 },
      ]);
    });
  });

});
