import * as Yup from 'yup';
import DeliveryProblem from '../models/DeliveryProblems';
import Delivery from '../models/Delivery';
import Recipient from '../models/Recipient';
import Deliveryman from '../models/Deliveryman';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class DeliveryProblemsController {
  async index(req, res) {
    const { id } = req.params;

    const problems = await DeliveryProblem.findAll({
      where: {
        delivery_id: id,
      },
      attributes: ['description'],
      include: [
        {
          model: Delivery,
          as: 'delivery',
          attributes: ['product', 'start_date', 'end_date'],
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
        },
      ],
    });

    return res.json(problems);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      description: Yup.string().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    req.body.delivery_id = req.params.id;

    const deliveryProblem = await DeliveryProblem.create(req.body);

    return res.json(deliveryProblem);
  }

  async delete(req, res) {
    const problem = await DeliveryProblem.findByPk(req.params.id);

    if (!problem) {
      return res.status(400).json({ error: 'Invalid problem code' });
    }

    const delivery = await Delivery.findByPk(problem.id, {
      attributes: ['id', 'product', 'start_date', 'end_date', 'canceled_at'],
      include: [
        {
          model: Deliveryman,
          as: 'deliveryman',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Recipient,
          as: 'recipient',
          attributes: [
            'id',
            'name',
            'street',
            'number',
            'complement',
            'post_code',
          ],
        },
      ],
    });

    if (delivery.canceled_at) {
      return res.status(400).json({ error: 'Delivery already canceled' });
    }

    delivery.canceled_at = new Date();

    await delivery.save();

    await Queue.add(CancellationMail.key, { delivery });

    return res.json(delivery);
  }
}

export default new DeliveryProblemsController();
