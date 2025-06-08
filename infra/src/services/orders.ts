import * as awsx from "@pulumi/awsx";
import * as pulumi from '@pulumi/pulumi';

import { cluster } from "../cluster";
import { ordersDockerImage } from "../images/orders";
import { amqpListener } from "./rabbitmq";
import { appLoadBalancer } from "../load-balancer";

const ordersTargetGroup = appLoadBalancer.createTargetGroup('orders-target', {
  port: 3333,
  protocol: 'HTTP',
  healthCheck: {
    path: '/health',
    protocol: 'HTTP',
  },
});

export const ordersHttpListener = appLoadBalancer.createListener('orders-listener', {
  port: 3333,
  protocol: 'HTTP',
  targetGroup: ordersTargetGroup,
});

export const ordersService = new awsx.classic.ecs.FargateService('fargate-orders', {
  cluster,
  desiredCount: 1,
  waitForSteadyState: false,
  taskDefinitionArgs: {
    container: {
      image: ordersDockerImage.ref,
      cpu: 256,
      memory: 512,
      environment: [
        {
          name: 'BROKER_URL',
          value: pulumi.interpolate`amqp://admin:admin@${amqpListener.endpoint.hostname}:${amqpListener.endpoint.port}`
        },
        {
          name: 'DATABASE_URL',
          value: 'DB_URL_HERE!!!',
        },
      ],
    },
  },
});
