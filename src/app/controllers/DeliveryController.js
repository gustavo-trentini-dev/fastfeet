import * as Yup from 'yup';
import Delivery from '../models/Delivery';
import Deliveryman from '../models/Deliveryman';
import Recipient from '../models/Recipient';

import DeliveryMail from '../jobs/DeliveryMail';
import Queue from '../../lib/Queue';

class OrderController {
  async index(req, res) {
    const deliveries = await Delivery.findAll();

    return res.json(deliveries);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      recipient_id: Yup.number().required(),
      deliveryman_id: Yup.number().required(),
      product: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { deliveryman_id, recipient_id } = req.body;

    const deliverymanExists = await Deliveryman.findByPk(deliveryman_id);

    if (!deliverymanExists) {
      return res.status(400).json({ error: 'Delivery Man does not exists' });
    }

    const recipientExists = await Recipient.findByPk(recipient_id);

    if (!recipientExists) {
      return res.status(400).json({ error: 'Recipient does not exists' });
    }

    const delivery = await Delivery.create(req.body);

    const mailDelivery = await Delivery.findByPk(delivery.id, {
      include: [
        {
          model: Recipient,
          as: 'recipient',
        },
        {
          model: Deliveryman,
          as: 'deliveryman',
        },
      ],
    });

    await Queue.add(DeliveryMail.key, { mailDelivery });

    return res.json(delivery);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      recipient_id: Yup.number(),
      deliveryman_id: Yup.number(),
      product: Yup.string(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const delivery = await Delivery.findByPk(req.params.id, {
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: ['name'],
        },
        {
          model: Deliveryman,
          as: 'deliveryman',
          attributes: ['name'],
        },
      ],
    });

    if (delivery.start_date) {
      return res.status(400).json({ error: 'The delivery already started' });
    }

    delivery.update(req.body);

    return res.json(delivery);
  }

  async delete(req, res) {
    const delivery = await Delivery.findByPk(req.params.id, {
      include: [
        {
          model: Deliveryman,
          as: 'deliveryman',
          attributes: ['name', 'email'],
        },
        {
          model: Recipient,
          as: 'recipient',
          attributes: ['id', 'name'],
        },
      ],
    });

    delivery.canceled_at = new Date();

    await delivery.save();

    return res.json(delivery);
  }
}

export default new OrderController();
