import '@opentelemetry/auto-instrumentations-node/register';

import { fastify } from 'fastify';
import { fastifyCors } from '@fastify/cors';
import { z } from 'zod';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider
} from 'fastify-type-provider-zod';
import { randomUUID } from 'node:crypto';
import { trace } from '@opentelemetry/api';
import { schema } from '../db/schema/index.ts';
import { db } from '../db/client.ts';
import { dispatchOrderCreated } from '../broker/messages/order-created.ts';

const app = fastify().withTypeProvider<ZodTypeProvider>();

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.register(fastifyCors, { origin: '*' });

app.get('/health', () => {
	return 'OK';
});

app.post('/orders', {
	schema: {
		body: z.object({
			amount: z.coerce.number(),
		}),
	},
}, async (request, reply) => {
	const { amount } = request.body;

	console.log('Creating an order with amount', amount);

	const orderId = randomUUID();

	await db.insert(schema.orders).values({
		id: orderId,
		customerId: '0792a305-4d5e-4909-ad6f-646e4e45e858',
		amount,
	});

	trace.getActiveSpan()?.setAttribute('order_id', orderId);

	dispatchOrderCreated({
		orderId,
		amount,
		customer: {
			id: '0792a305-4d5e-4909-ad6f-646e4e45e858',
		},
	});

	return reply.status(201).send();
})

app.listen({
  host: '0.0.0.0',
  port: 3333,
}).then(() => {
  console.log('[Orders] HTTP Server running!')
})
