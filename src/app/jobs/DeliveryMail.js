import Mail from '../../lib/Mail';

class DeliveryMail {
  get key() {
    return 'DeliveryMail';
  }

  async handle({ data }) {
    const { mailDelivery } = data;

    await Mail.sendMail({
      to: `${mailDelivery.deliveryman.name} <${mailDelivery.deliveryman.email}>`,
      subject: 'Você tem uma nova entrega',
      template: 'delivery',
      context: {
        deliveryman: mailDelivery.deliveryman.name,
        recipient: mailDelivery.recipient,
      },
    });
  }
}

export default new DeliveryMail();
