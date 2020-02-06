import * as Yup from 'yup';
import {
  parseISO,
  isBefore,
  setHours,
  setMinutes,
  isAfter,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Op } from 'sequelize';
import Delivery from '../models/Delivery';
import File from '../models/File';
import Deliveryman from '../models/Deliveryman';
import Recipient from '../models/Recipient';

class PickupController {
  async index(req, res) {
    if (!req.params.id) {
      res.status(400).json({ error: 'You have to inform an Id' });
    }
    const deliveries = await Delivery.findAll({
      where: {
        deliveryman_id: req.params.id,
        canceled_at: null,
        end_date: null,
      },
    });
    return res.json(deliveries);
  }

  async start(req, res) {
    const schema = Yup.object().shape({
      start_date: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { start_date } = req.body;
    const pickupStart = '08:00';
    const pickupEnd = '23:59';

    const pickupTime = parseISO(start_date);

    if (isBefore(pickupTime, new Date())) {
      return res
        .status(400)
        .json({ error: 'Cannot start a delivery with past date' });
    }

    const [startH, startM] = pickupStart.split(':');
    const [endH, endM] = pickupEnd.split(':');
    const start = setMinutes(
      setMinutes(setHours(pickupTime, startH), startM),
      0
    );
    const end = setMinutes(setMinutes(setHours(pickupTime, endH), endM), 0);

    if (!isAfter(pickupTime, start) || !isBefore(pickupTime, end)) {
      return res.status(400).json({ error: 'Out of time for pickup' });
    }

    const delivery = await Delivery.findByPk(req.params.id);

    if (delivery.start_date) {
      return res.status(400).json({ error: 'This delivery already started' });
    }

    const numberOfDeliveries = await Delivery.count({
      where: {
        deliveryman_id: delivery.deliveryman_id,
        start_date: {
          [Op.between]: [startOfDay(pickupTime), endOfDay(pickupTime)],
        },
        end_date: null,
      },
    });

    if (numberOfDeliveries >= 5) {
      return res
        .status(400)
        .json({ error: 'You reached your delivery limit for today' });
    }

    await delivery.update(req.body, {
      returning: true,
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'name',
            'post_code',
            'state',
            'street',
            'number',
            'complement',
          ],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['name', 'path', 'url'],
        },
      ],
    });

    return res.json(delivery);
  }

  async end(req, res) {
    const schema = Yup.object().shape({
      end_date: Yup.string().required(),
      signature_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { end_date } = req.body;

    const delivery = await Delivery.findByPk(req.params.id);

    if (delivery.end_date) {
      return res
        .status(400)
        .json({ error: 'This package was already delivered' });
    }

    if (!delivery.start_date) {
      return res
        .status(400)
        .json({ error: 'You cannot end a delivery without stated it' });
    }

    if (isBefore(parseISO(end_date), delivery.start_date)) {
      return res.status(400).json({
        error: 'Date of deliver cannot be before than pickup date',
      });
    }

    await delivery.update(req.body, {
      returning: true,
      include: [
        {
          model: Recipient,
          as: 'recipient',
          attributes: ['name', 'street', 'number', 'complement'],
        },
        {
          model: File,
          as: 'signature',
          attributes: ['name', 'path', 'url'],
        },
      ],
    });

    return res.json(delivery);
  }
}

export default new PickupController();
