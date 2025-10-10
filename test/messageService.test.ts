// test/messageService.test.ts

// 1. Mocks principales de orbisDB y models
const dbMock = {
  getConnectedUser: jest.fn(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  context: jest.fn().mockReturnThis(),
  run: jest.fn(),
  insert: jest.fn().mockReturnThis(),
  value: jest.fn().mockReturnThis(),
};

const modelsMock = { 
  message: 'MessageTable'
};
const contextsMock = { whispy_test: 'testContext' };

// 2. Mock orbisDB
jest.mock('@/app/ceramic/orbisDB', () => ({
  db: dbMock,
  models: modelsMock,
  contexts: contextsMock,
}));

// 3. Mock otras dependencias externas
jest.mock('@/app/ceramic/userService', () => ({
  getUserById: jest.fn()
}));
jest.mock('@/app/ceramic/chatService', () => ({
  getChatMembersComplete: jest.fn()
}));
jest.mock('@/app/ceramic/criptoService', () => ({
  decryptMessage: jest.fn(),
  encryptMessage: jest.fn()
}));

import { retrieveMessages, sendMessage } from '@/app/ceramic/messageService';
import { getUserById } from '@/app/ceramic/userService';
import { getChatMembersComplete } from '@/app/ceramic/chatService';
import { decryptMessage, encryptMessage } from '@/app/ceramic/criptoService';

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('messageService', () => {
  describe('retrieveMessages', () => {
    it('devuelve mensajes desencriptados correctamente', async () => {
      // Mocks básicos de db
      dbMock.select.mockReturnThis();
      dbMock.context.mockReturnThis();
      dbMock.from.mockReturnThis();
      dbMock.where.mockReturnThis();
      dbMock.run.mockResolvedValue({
        rows: [
          { author: 'userA', content: 'encrypted1', iv: 'iv1' },
          { author: 'userB', content: 'encrypted2', iv: 'iv2' },
        ]
      });

      // getUserById devuelve el publicKey para cada author
      (getUserById as jest.Mock)
        .mockResolvedValueOnce({ publicKey: { kty: 'OK1' } })
        .mockResolvedValueOnce({ publicKey: JSON.stringify({ kty: 'OK2' }) });
      // decryptMessage mock
      (decryptMessage as jest.Mock)
        .mockResolvedValueOnce('mensaje-descifrado-1')
        .mockResolvedValueOnce('mensaje-descifrado-2');

      const res = await retrieveMessages('chat123', 'myStream', { kty: 'priv' } as any);

      expect(dbMock.where).toHaveBeenCalledWith({
        chatId: 'chat123',
        receiver: 'myStream'
      });
      expect(getUserById).toHaveBeenCalledTimes(2);
      expect(decryptMessage).toHaveBeenCalledTimes(2);
      expect(res).toEqual([
        { author: 'userA', content: 'mensaje-descifrado-1', iv: 'iv1' },
        { author: 'userB', content: 'mensaje-descifrado-2', iv: 'iv2' },
      ]);
    });
  });

  describe('sendMessage', () => {
    it('envía un mensaje a todos los miembros del chat', async () => {
      dbMock.getConnectedUser.mockResolvedValue({ user: { did: 'did:test' } });
      (getChatMembersComplete as jest.Mock).mockResolvedValue([
        { stream_id: 'u1', publicKey: { kty: 'k1' } },
        { stream_id: 'u2', publicKey: JSON.stringify({ kty: 'k2' }) }
      ]);
      (encryptMessage as jest.Mock)
        .mockResolvedValueOnce({ content: 'encr1', iv: 'iv1' })
        .mockResolvedValueOnce({ content: 'encr2', iv: 'iv2' });
      dbMock.insert.mockReturnThis();
      dbMock.value.mockReturnThis();
      dbMock.context.mockReturnThis();
      dbMock.run.mockResolvedValue({});

      await sendMessage('hola', 'chatId', 'author', { kty: 'priv' } as any, "text");

      // Debe enviar dos mensajes (uno por miembro)
      expect(encryptMessage).toHaveBeenCalledTimes(2);
      expect(dbMock.insert).toHaveBeenCalledWith('MessageTable');
      expect(dbMock.value).toHaveBeenCalledWith(expect.objectContaining({
        author: 'author',
        receiver: expect.any(String),
        chatId: 'chatId',
        content: expect.any(String),
        iv: expect.any(String),
        msgType: "text",
        date: expect.any(String),
      }));
      expect(dbMock.run).toHaveBeenCalledTimes(2);
    });

    it('loggea el error si ocurre una excepción', async () => {
      dbMock.getConnectedUser.mockRejectedValue(new Error('fail'));
      await sendMessage('failmsg', 'failchat', 'author', { kty: 'priv' } as any, "text");
      expect(console.error).toHaveBeenCalledWith("Error sending message:", expect.any(Error));
    });
  });
});
